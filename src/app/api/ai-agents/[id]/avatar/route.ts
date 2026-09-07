import { NextResponse } from "next/server";
import { put, del, get } from "@vercel/blob";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { aiAgents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isBlobConfigured } from "@/lib/blob/config";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  isAllowedAvatarFile,
  MAX_AVATAR_FILE_SIZE_BYTES,
} from "@/lib/validation/aiAgent";
import { findSensitiveDataReason } from "@/lib/sensitiveDataCheck";
import { getAiAgentById } from "@/lib/queries/aiAgents";
import { logAuditEvent } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isBlobConfigured() || !isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Storage or database is not configured yet." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const agent = await getAiAgentById(id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }

  if (!isAllowedAvatarFile(file.name)) {
    return NextResponse.json(
      { error: "Unsupported file type.", code: "unsupported_type" },
      { status: 400 },
    );
  }

  if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File is too large.", code: "too_large" },
      { status: 400 },
    );
  }

  const sensitiveReason = findSensitiveDataReason(file.name);
  if (sensitiveReason) {
    return NextResponse.json(
      { error: "This appears to contain sensitive data.", code: "sensitive_data", reason: sensitiveReason },
      { status: 400 },
    );
  }

  const previousUrl = agent.avatarUrl;

  const blob = await put(`ai-agents/avatars/${id}-${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
  });

  await getDb()
    .update(aiAgents)
    .set({ avatarUrl: blob.url, updatedAt: new Date() })
    .where(eq(aiAgents.id, id));

  if (previousUrl) {
    try {
      await del(previousUrl);
    } catch {
      // Best-effort cleanup — a stray blob from a prior upload isn't worth
      // failing this request over.
    }
  }

  await logAuditEvent({
    action: "ai_agent.avatar_updated",
    entityType: "ai_agent",
    entityId: id,
    summary: `Updated avatar image for AI agent "${agent.name}"`,
  });

  return NextResponse.json({ avatarUrl: blob.url });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const agent = await getAiAgentById(id);
  if (!agent?.avatarUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await get(agent.avatarUrl, { access: "private" });
  if (!result) {
    return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", result.blob.contentType || "application/octet-stream");
  headers.set("Content-Length", String(result.blob.size));
  headers.set("Cache-Control", "private, max-age=300");

  return new NextResponse(result.stream, { headers });
}

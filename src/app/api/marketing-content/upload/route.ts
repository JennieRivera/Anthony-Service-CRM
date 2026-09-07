import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { marketingContentAssets } from "@/lib/db/schema";
import { isBlobConfigured } from "@/lib/blob/config";
import { isDatabaseConfigured } from "@/lib/db/config";
import { serviceTypeValues } from "@/lib/validation/client";
import {
  isAllowedMarketingContentFile,
  marketingChannelValues,
} from "@/lib/validation/marketingContent";
import { findSensitiveDataReason } from "@/lib/sensitiveDataCheck";

export async function POST(request: Request) {
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

  const formData = await request.formData();
  const file = formData.get("file");
  const serviceType = formData.get("serviceType");
  const publishedDate = formData.get("publishedDate");
  const channel = formData.get("channel");
  const caption = formData.get("caption");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }

  if (!isAllowedMarketingContentFile(file.name)) {
    return NextResponse.json(
      { error: "Unsupported file type.", code: "unsupported_type" },
      { status: 400 },
    );
  }

  // Images/video content can't be scanned, but the filename and caption
  // (both free text) can be — same rule as everywhere else in the app.
  const captionText = typeof caption === "string" ? caption : "";
  const sensitiveReason =
    findSensitiveDataReason(file.name) ?? findSensitiveDataReason(captionText);
  if (sensitiveReason) {
    return NextResponse.json(
      { error: "This appears to contain sensitive data.", code: "sensitive_data", reason: sensitiveReason },
      { status: 400 },
    );
  }

  const validServiceType =
    typeof serviceType === "string" &&
    (serviceTypeValues as readonly string[]).includes(serviceType)
      ? (serviceType as (typeof serviceTypeValues)[number])
      : null;
  const validChannel =
    typeof channel === "string" &&
    (marketingChannelValues as readonly string[]).includes(channel)
      ? (channel as (typeof marketingChannelValues)[number])
      : null;
  const validPublishedDate =
    typeof publishedDate === "string" && publishedDate ? publishedDate : null;

  const blob = await put(`marketing-content/${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
  });

  const [asset] = await getDb()
    .insert(marketingContentAssets)
    .values({
      serviceType: validServiceType,
      publishedDate: validPublishedDate,
      channel: validChannel,
      caption: captionText || null,
      fileName: file.name,
      blobUrl: blob.url,
    })
    .returning();

  return NextResponse.json({ asset });
}

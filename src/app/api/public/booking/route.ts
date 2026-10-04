import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { submitPublicBooking } from "@/lib/booking/server";

// Public route (no login — /api is outside proxy.ts's matcher): the
// /book page's "Request appointment" submit. Layers, in order: Vercel
// BotID → body size cap → full Zod validation → honeypot → server-side
// slot re-check → atomic Postgres booking with per-phone/per-IP limits.
// The response only ever echoes back what the visitor submitted.

const MAX_BODY_BYTES = 8 * 1024;

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || null;
}

export async function POST(request: Request) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ status: "forbidden" }, { status: 403 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ status: "invalid", fields: [] }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ status: "invalid", fields: [] }, { status: 400 });
  }

  try {
    const result = await submitPublicBooking(body, { ip: clientIp(request) });
    const httpStatus =
      result.status === "ok"
        ? 200
        : result.status === "invalid"
          ? 400
          : result.status === "rate_limited"
            ? 429
            : 409;
    return NextResponse.json(result, { status: httpStatus });
  } catch (err) {
    console.error("Online booking failed:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

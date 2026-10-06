import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { logAuditEvent } from "@/lib/audit";
import { recordConsentEvent } from "@/lib/legal/texts";
import { isStopMessage } from "@/lib/notifications/config";
import { applySmsStop } from "@/lib/notifications/engine";
import { noticeDb } from "@/lib/notifications/server";
import { isValidTwilioSignature } from "@/lib/notifications/twilioSignature";

// Incoming SMS from Twilio (Step 3B). Only one job: when a client replies
// STOP / BAJA / ALTO (or another opt-out word), withdraw their SMS
// authorization automatically and record it in their history. Twilio
// itself also stops delivering to that number and sends the standard
// opt-out confirmation. Every request must carry a valid Twilio signature.

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const twiml = () => new NextResponse(EMPTY_TWIML, { headers: { "Content-Type": "text/xml" } });

export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !isDatabaseConfigured()) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const raw = await request.text();
  if (raw.length > 20000) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const params = Object.fromEntries(new URLSearchParams(raw));
  // The exact public URL configured in Twilio (set TWILIO_WEBHOOK_URL if a
  // proxy ever changes what request.url looks like).
  const url = process.env.TWILIO_WEBHOOK_URL || request.url;
  if (!isValidTwilioSignature(authToken, request.headers.get("x-twilio-signature"), url, params)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const text = params.Body ?? "";
  if (!isStopMessage(text) || !params.From) return twiml();

  const db = noticeDb();
  const count = await applySmsStop(db, { fromPhone: params.From, text }, (clientId) =>
    recordConsentEvent(db, {
      clientId,
      consentType: "sms",
      granted: false,
      source: "sms_reply",
      textShown: `Client texted "${text.trim().slice(0, 40)}"`,
      ipAddress: null,
      userAgent: null,
    }),
  );
  await logAuditEvent({
    action: "notices.sms_opt_out",
    entityType: "client",
    summary: `SMS opt-out received (${text.trim().slice(0, 20)}); clients updated: ${count}`,
    actor: "twilio-webhook",
  });
  return twiml();
}

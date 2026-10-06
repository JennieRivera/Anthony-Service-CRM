// Email (Resend) and SMS (Twilio) senders for automatic notices (Step 3B).
// Plain HTTPS calls to each provider's REST API; credentials come only
// from environment variables (Vercel), never from code or the database.
// Like getDb(), everything here is lazy: importing this file never throws
// when a provider isn't configured yet — callers check isEmailConfigured()
// / isSmsConfigured() and skip that channel.

import type { Channel } from "./config";

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

export type Senders = {
  configured: (channel: Channel) => boolean;
  email: (msg: { to: string; subject: string; html: string; text: string }) => Promise<SendResult>;
  sms: (msg: { to: string; body: string }) => Promise<SendResult>;
};

// Resend (Vercel Marketplace integration → RESEND_API_KEY).
export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

// Twilio, sending from the verified toll-free number (855) 600-0634 —
// no A2P 10DLC involved. Needs the account SID + auth token, a sender
// (preferably the Messaging Service that contains the toll-free number,
// TWILIO_MESSAGING_SERVICE_SID; or the number itself, TWILIO_FROM_NUMBER),
// and an explicit TWILIO_SMS_ENABLED=true, which the owner sets in Vercel
// only once Toll-Free Verification is approved. Until then SMS counts as
// "not connected": no real SMS is ever attempted, and notices use the
// client's next authorized channel (or a "Call the client" task).
export type SmsSetupStatus = "ready" | "missing_credentials" | "missing_sender" | "not_enabled";

export function smsSetupStatus(): SmsSetupStatus {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return "missing_credentials";
  if (!process.env.TWILIO_MESSAGING_SERVICE_SID && !process.env.TWILIO_FROM_NUMBER) return "missing_sender";
  if (process.env.TWILIO_SMS_ENABLED !== "true") return "not_enabled";
  return "ready";
}

export function isSmsConfigured() {
  return smsSetupStatus() === "ready";
}

export const NOTICE_FROM_EMAIL = () =>
  process.env.NOTIFICATIONS_FROM_EMAIL || "Anthony Multiservice <avisos@anthonyservice.com>";

// avisos@ has no mailbox: replies go to the owner's own inbox (the CRM
// owner's Gmail, ADMIN_EMAIL), unless NOTIFICATIONS_REPLY_TO says otherwise.
export const NOTICE_REPLY_TO = () => process.env.NOTIFICATIONS_REPLY_TO || process.env.ADMIN_EMAIL || null;

async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<SendResult> {
  if (!isEmailConfigured()) return { ok: false, error: "email_not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTICE_FROM_EMAIL(),
        to: [msg.to],
        ...(NOTICE_REPLY_TO() ? { reply_to: NOTICE_REPLY_TO() } : {}),
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) return { ok: false, error: `resend_${res.status}: ${(data.message ?? data.name ?? "").slice(0, 200)}` };
    return { ok: true, id: data.id ?? null };
  } catch (err) {
    return { ok: false, error: `resend_request_failed: ${err instanceof Error ? err.message.slice(0, 200) : "unknown"}` };
  }
}

async function sendSms(msg: { to: string; body: string }): Promise<SendResult> {
  if (!isSmsConfigured()) return { ok: false, error: "sms_not_configured" };
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const form = new URLSearchParams({ To: msg.to, Body: msg.body });
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) form.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  else form.set("From", process.env.TWILIO_FROM_NUMBER!);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
    if (!res.ok) return { ok: false, error: `twilio_${res.status}${data.code ? `_${data.code}` : ""}: ${(data.message ?? "").slice(0, 200)}` };
    return { ok: true, id: data.sid ?? null };
  } catch (err) {
    return { ok: false, error: `twilio_request_failed: ${err instanceof Error ? err.message.slice(0, 200) : "unknown"}` };
  }
}

export const realSenders: Senders = {
  configured: (channel) => (channel === "email" ? isEmailConfigured() : isSmsConfigured()),
  email: sendEmail,
  sms: sendSms,
};

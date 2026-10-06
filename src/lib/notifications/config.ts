// Automatic notices (Step 3B) — pure constants and rules, no database or
// provider code, safe to import anywhere (including client components).
// Rules approved by the owner on 2026-10-05:
//   - one channel per notice: the client's preferred channel if it is
//     authorized, otherwise SMS, otherwise email; none → a "Call the
//     client" task instead;
//   - service notices only (appointments, case updates, portal link) —
//     never marketing;
//   - SMS only 8:00 AM–8:00 PM Florida time;
//   - no sensitive data in any notice (date/time of an appointment, or
//     "you have an update in your portal" + link — nothing else);
//   - test mode sends every client notice to the owner's own phone/email.

import { BUSINESS_TIME_ZONE, businessDateString, businessLocalToUtc } from "@/lib/dates";

export const CLIENT_NOTICE_TYPES = [
  "appointment_confirmed",
  "appointment_reminder_24h",
  "appointment_reminder_2h",
  "case_update",
  "portal_link",
] as const;
export type ClientNoticeType = (typeof CLIENT_NOTICE_TYPES)[number];

export const OWNER_NOTICE_TYPES = [
  "owner_new_booking",
  "owner_document_uploaded",
  "owner_change_request",
] as const;
export type OwnerNoticeType = (typeof OWNER_NOTICE_TYPES)[number];

export type NoticeType = ClientNoticeType | OwnerNoticeType;
export const NOTICE_TYPES: readonly NoticeType[] = [...CLIENT_NOTICE_TYPES, ...OWNER_NOTICE_TYPES];

// English names, used in stored task titles / Communications summaries
// (translated for display by localizeBookingTitle()).
export const NOTICE_LABELS_EN: Record<NoticeType, string> = {
  appointment_confirmed: "Appointment confirmed",
  appointment_reminder_24h: "Appointment reminder",
  appointment_reminder_2h: "Appointment reminder (2 hours)",
  case_update: "Case update",
  portal_link: "Portal link",
  owner_new_booking: "New online booking",
  owner_document_uploaded: "Client uploaded a document",
  owner_change_request: "Appointment change request",
};

// Every type on by default (the master switch and test mode are the
// safety nets). The 2-hour reminder only runs when preciseReminders is on
// (the default since the project moved to Vercel Pro, 2026-10-05).
export const DEFAULT_NOTICE_TYPES: Record<NoticeType, boolean> = Object.fromEntries(
  NOTICE_TYPES.map((t) => [t, true]),
) as Record<NoticeType, boolean>;

export type NotificationSettings = {
  enabled: boolean;
  testMode: boolean;
  testEmail: string;
  testPhone: string;
  ownerAlertEmail: string;
  types: Record<NoticeType, boolean>;
  preciseReminders: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  testMode: true,
  testEmail: "",
  testPhone: "",
  ownerAlertEmail: "",
  types: DEFAULT_NOTICE_TYPES,
  preciseReminders: true,
};

export type Channel = "email" | "sms";

// ── channel choice ───────────────────────────────────────────────────

export type ChannelFacts = {
  preferredChannel: string | null;
  smsConsent: boolean;
  emailConsent: boolean;
  smsStatus: string | null;
  emailStatus: string | null;
  phone: string | null;
  email: string | null;
};

export const SMS_BLOCKED_STATUSES = ["opted_out", "invalid"];
export const EMAIL_BLOCKED_STATUSES = ["unsubscribed", "bounced", "invalid"];

export function usPhoneE164(phone: string | null | undefined): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? `+1${digits}` : null;
}

const looksLikeEmail = (email: string | null | undefined) => !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function usableChannels(f: ChannelFacts): Channel[] {
  const out: Channel[] = [];
  if (f.smsConsent && !SMS_BLOCKED_STATUSES.includes(f.smsStatus ?? "") && usPhoneE164(f.phone)) out.push("sms");
  if (f.emailConsent && !EMAIL_BLOCKED_STATUSES.includes(f.emailStatus ?? "") && looksLikeEmail(f.email)) out.push("email");
  return out;
}

// Preferred (if usable) → SMS → email → none.
export function chooseChannel(f: ChannelFacts): Channel | null {
  const usable = usableChannels(f);
  if (f.preferredChannel === "sms" || f.preferredChannel === "email") {
    if (usable.includes(f.preferredChannel)) return f.preferredChannel;
  }
  return usable[0] ?? null;
}

// ── SMS quiet hours (8:00 AM–8:00 PM Florida time) ───────────────────

export const SMS_WINDOW_START_HOUR = 8;
export const SMS_WINDOW_END_HOUR = 20;

function floridaHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now),
  );
}

export function isWithinSmsHours(now: Date): boolean {
  const h = floridaHour(now);
  return h >= SMS_WINDOW_START_HOUR && h < SMS_WINDOW_END_HOUR;
}

// The next instant SMS may go out: now if inside the window, otherwise
// 8:00 AM Florida time (today if it's early morning, else tomorrow).
export function nextSmsSendTime(now: Date): Date {
  if (isWithinSmsHours(now)) return now;
  const today = businessDateString(now);
  const todayAt8 = businessLocalToUtc(`${today}T08:00`);
  if (todayAt8 > now) return todayAt8;
  const tomorrow = businessDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  return businessLocalToUtc(`${tomorrow}T08:00`);
}

// ── STOP keywords (English + Spanish) ────────────────────────────────

export const SMS_STOP_KEYWORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "BAJA", "ALTO", "PARAR"];

export function isStopMessage(body: string | null | undefined): boolean {
  const word = (body ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return SMS_STOP_KEYWORDS.includes(word);
}

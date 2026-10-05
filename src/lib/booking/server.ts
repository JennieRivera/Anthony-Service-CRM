import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { formatUsPhone, publicBookingSchema, usPhoneDigits } from "@/lib/validation/onlineBooking";
import { getBusyIntervals, getOnlineBookingConfig } from "@/lib/queries/onlineBooking";
import { BOOKING_RATE_LIMITS, type ServiceType } from "./config";
import { bookingLanguageNote, buildBookingTitle } from "./titles";
import { getLegalTexts, pickLocale, recordConsentEvent } from "@/lib/legal/texts";
import type { PortalDb } from "@/lib/portal/db";
import {
  bookingWindowDates,
  computeAvailability,
  computeDaySlots,
  slotInstant,
  type DayAvailability,
} from "./slots";

// Server-only logic behind the two public endpoints under
// /api/public/booking. Everything returned from here is either free
// times or an echo of what the visitor themself submitted — never any
// existing client's or appointment's data.

const DAY_MS = 24 * 60 * 60 * 1000;

export type PublicBookingService = { serviceType: ServiceType; durationMinutes: number };

export async function getPublicBookingServices(): Promise<{
  enabled: boolean;
  services: PublicBookingService[];
}> {
  const { settings, services } = await getOnlineBookingConfig();
  return {
    enabled: settings.enabled,
    services: services
      .filter((s) => s.bookable)
      .map(({ serviceType, durationMinutes }) => ({ serviceType, durationMinutes })),
  };
}

export async function getPublicAvailability(
  serviceType: string,
  nowMs = Date.now(),
): Promise<DayAvailability[] | null> {
  const { settings, services, blockedDates } = await getOnlineBookingConfig();
  const service = services.find((s) => s.serviceType === serviceType && s.bookable);
  if (!settings.enabled || !service) return null;

  const window = bookingWindowDates(nowMs, settings.maxDaysAhead);
  const busy = await getBusyIntervals(
    slotInstant(window[0], "00:00", 0).startMs - DAY_MS,
    slotInstant(window[window.length - 1], "00:00", 0).startMs + 2 * DAY_MS,
  );
  return computeAvailability({
    settings,
    durationMinutes: service.durationMinutes,
    blockedDates: new Set(blockedDates.map((b) => b.date)),
    busy,
    nowMs,
  });
}

function rateLimitKey(kind: "phone" | "ip", value: string): string {
  const secret = process.env.AUTH_SECRET;
  // Fail closed: without a secret there's no safe way to hash, and
  // storing raw IPs/phones is not an option.
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return createHmac("sha256", secret).update(`online-booking:${kind}:${value}`).digest("hex");
}

export type PublicBookingSummary = {
  serviceType: ServiceType;
  date: string;
  time: string;
  durationMinutes: number;
  fullName: string;
  phone: string;
  email: string;
  preferredLanguage: "en" | "es";
};

export type PublicBookingResult =
  | { status: "ok"; summary: PublicBookingSummary }
  | { status: "invalid"; fields: string[] }
  | { status: "unavailable" | "slot_taken" | "rate_limited" };

export async function submitPublicBooking(
  raw: unknown,
  context: { ip: string | null; userAgent?: string | null },
  nowMs = Date.now(),
): Promise<PublicBookingResult> {
  const parsed = publicBookingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "invalid",
      fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? "")))],
    };
  }
  const values = parsed.data;
  const phoneDigits = usPhoneDigits(values.phone)!;

  const { settings, services, blockedDates } = await getOnlineBookingConfig();
  const service = services.find((s) => s.serviceType === values.serviceType && s.bookable);
  if (!settings.enabled || !service) return { status: "unavailable" };

  const summary: PublicBookingSummary = {
    serviceType: values.serviceType,
    date: values.date,
    time: values.time,
    durationMinutes: service.durationMinutes,
    fullName: values.fullName,
    phone: formatUsPhone(phoneDigits),
    email: values.email,
    preferredLanguage: values.preferredLanguage,
  };

  // Honeypot filled in: answer exactly like a success so the bot has no
  // signal to adapt to, but write nothing.
  if (values.website.trim() !== "") return { status: "ok", summary };

  // Re-derive the slot server-side (business hours, 30-min grid, blocked
  // days, minimum notice, window) instead of trusting the submitted time.
  const { startMs, endMs } = slotInstant(values.date, values.time, service.durationMinutes);
  const busy = await getBusyIntervals(startMs - DAY_MS, endMs + DAY_MS);
  const freeSlots = computeDaySlots({
    date: values.date,
    settings,
    durationMinutes: service.durationMinutes,
    blockedDates: new Set(blockedDates.map((b) => b.date)),
    busy,
    nowMs,
  });
  if (!freeSlots.includes(values.time)) return { status: "slot_taken" };

  // Stored in English; translated for display by localizeBookingTitle().
  const title = buildBookingTitle(values.serviceType, values.fullName);
  const notes = [
    "Online booking request — pending confirmation. Phone appointment: call the client at the scheduled time.",
    `Name entered: ${values.fullName}`,
    `Phone entered: ${formatUsPhone(phoneDigits)}`,
    `Email entered: ${values.email || "(none)"}`,
    `Preferred language: ${values.preferredLanguage === "es" ? "Spanish" : "English"}`,
    values.comment ? `Comment: ${values.comment}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const rateKeys = [rateLimitKey("phone", phoneDigits)];
  const rateLimits: number[] = [BOOKING_RATE_LIMITS.perPhone];
  if (context.ip) {
    rateKeys.push(rateLimitKey("ip", context.ip));
    rateLimits.push(BOOKING_RATE_LIMITS.perIp);
  }

  // One round trip; the function does the lock + rate limit + overlap
  // check + client match/create + inserts atomically — see migration
  // 0062_online_booking_book_fn.sql for why this can't be done from here
  // (v2, migration 0063, adds the language note on the confirmation task).
  const result = await getDb().execute(sql`
    select status, appointment_id, client_id from book_online_appointment_v2(
      ${new Date(startMs).toISOString()}::timestamptz,
      ${new Date(endMs).toISOString()}::timestamptz,
      ${settings.bufferMinutes}::integer,
      ${values.serviceType}::service_type,
      ${title},
      ${notes},
      ${values.fullName},
      ${formatUsPhone(phoneDigits)},
      ${phoneDigits},
      ${values.email},
      ${values.preferredLanguage},
      ${new Date(nowMs).toISOString()}::timestamptz,
      ARRAY[${sql.join(rateKeys.map((k) => sql`${k}`), sql`, `)}]::text[],
      ARRAY[${sql.join(rateLimits.map((n) => sql`${n}`), sql`, `)}]::integer[],
      ${BOOKING_RATE_LIMITS.windowMinutes}::integer,
      ${bookingLanguageNote(values.preferredLanguage)}
    )
  `);
  const rows = Array.isArray(result) ? result : (result as { rows: unknown[] }).rows;
  const row = rows[0] as { status?: string; appointment_id?: string; client_id?: string } | undefined;
  const status = row?.status;

  if (status === "ok") {
    // Evidence of the mandatory "not a law firm" acknowledgment, tied to
    // this booking (date/time, IP, browser, exact text shown).
    if (row?.client_id) {
      const db = getDb() as unknown as PortalDb;
      const texts = await getLegalTexts(db);
      await recordConsentEvent(db, {
        clientId: row.client_id,
        appointmentId: row.appointment_id ?? null,
        consentType: "not_a_law_firm",
        granted: true,
        source: "online_booking",
        textShown: pickLocale(texts.not_a_law_firm_ack, values.locale ?? values.preferredLanguage),
        ipAddress: context.ip,
        userAgent: context.userAgent ?? null,
      });
    }
    return { status: "ok", summary };
  }
  if (status === "slot_taken" || status === "rate_limited") return { status };
  throw new Error(`Unexpected booking result: ${String(status)}`);
}

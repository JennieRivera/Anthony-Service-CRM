import { z } from "zod";
import { serviceTypeValues } from "./client";

// Normalizes a US phone number to its 10 digits, or null if it isn't one.
// Accepts any punctuation and an optional leading country code 1.
export function usPhoneDigits(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10 || !/^[2-9]/.test(digits)) return null;
  return digits;
}

export function formatUsPhone(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Free text from the public internet: no control characters, no angle
// brackets (nothing here is ever rendered as HTML, but there's no reason
// a name or comment would need them either).
const SAFE_TEXT = /^[^\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]*$/;

// Public /book form. Error messages are translation-key suffixes (looked
// up under Book.errors.* by the form), never displayed English text.
// Re-validated server-side in POST /api/public/booking — the client copy
// is only for instant feedback.
export const publicBookingSchema = z.object({
  serviceType: z.enum(serviceTypeValues, { message: "service" }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "slot"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "slot"),
  fullName: z
    .string()
    .trim()
    .min(2, "name")
    .max(100, "nameTooLong")
    .regex(SAFE_TEXT, "name"),
  phone: z
    .string()
    .trim()
    .max(30, "phone")
    .refine((v) => usPhoneDigits(v) !== null, "phone"),
  // Optional (clients are called by phone): empty is accepted; anything
  // typed must be a valid address.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "email")
    .pipe(z.union([z.literal(""), z.email("email")])),
  comment: z.string().trim().max(1000, "commentTooLong").regex(SAFE_TEXT, "comment"),
  preferredLanguage: z.enum(["en", "es"]),
  consent: z.literal(true, { message: "consent" }),
  // Honeypot: visually hidden, never filled in by a real person.
  website: z.string().max(500),
});

export type PublicBookingValues = z.input<typeof publicBookingSchema>;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm");

// Settings → Online booking (staff-only).
export const onlineBookingSettingsFormSchema = z.object({
  enabled: z.boolean(),
  weeklyHours: z
    .array(
      z
        .object({ open: z.boolean(), start: hhmm, end: hhmm })
        .refine((d) => !d.open || d.start < d.end, {
          message: "Closing time must be after opening time",
          path: ["end"],
        }),
    )
    .length(7),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(240),
  bufferMinutes: z.coerce.number().int().min(0).max(240),
  minNoticeMinutes: z.coerce.number().int().min(0).max(14 * 24 * 60),
  maxDaysAhead: z.coerce.number().int().min(1).max(365),
  services: z.array(
    z.object({
      serviceType: z.enum(serviceTypeValues),
      bookable: z.boolean(),
      durationMinutes: z.coerce.number().int().min(5).max(480),
    }),
  ),
});

export type OnlineBookingSettingsFormValues = z.input<typeof onlineBookingSettingsFormSchema>;

export const blockedDateFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  reason: z.string().trim().max(200),
});

export type BlockedDateFormValues = z.infer<typeof blockedDateFormSchema>;

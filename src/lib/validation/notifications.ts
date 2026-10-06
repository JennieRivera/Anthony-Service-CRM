import { z } from "zod";
import { NOTICE_TYPES, type NoticeType } from "@/lib/notifications/config";
import { usPhoneDigits } from "./onlineBooking";

// Settings → Automatic notices (Step 3B).

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine((v) => v === "" || z.email().safeParse(v).success, "email");

const optionalPhone = z
  .string()
  .trim()
  .max(30)
  .refine((v) => v === "" || usPhoneDigits(v) !== null, "phone");

export const notificationSettingsFormSchema = z.object({
  enabled: z.boolean(),
  testMode: z.boolean(),
  testEmail: optionalEmail,
  testPhone: optionalPhone,
  ownerAlertEmail: optionalEmail,
  preciseReminders: z.boolean(),
  types: z.object(
    Object.fromEntries(NOTICE_TYPES.map((t) => [t, z.boolean()])) as Record<NoticeType, z.ZodBoolean>,
  ),
});
export type NotificationSettingsFormValues = z.input<typeof notificationSettingsFormSchema>;

// Only these placeholders exist; anything else in braces is a typo.
const ALLOWED_PLACEHOLDERS = ["name", "date", "time", "link", "phone", "client", "kind"];
const placeholdersOk = (s: string) =>
  [...s.matchAll(/\{(\w+)\}/g)].every((m) => ALLOWED_PLACEHOLDERS.includes(m[1]));

export const notificationTextFormSchema = z.object({
  type: z.enum(NOTICE_TYPES as [NoticeType, ...NoticeType[]]),
  channel: z.enum(["email", "sms"]),
  language: z.enum(["en", "es"]),
  subject: z.string().trim().max(200).refine(placeholdersOk, "placeholder"),
  // SMS: kept short (the business name and the STOP line are added on top).
  body: z.string().trim().min(1, "body").max(2000).refine(placeholdersOk, "placeholder"),
});
export type NotificationTextFormValues = z.input<typeof notificationTextFormSchema>;

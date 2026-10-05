import { z } from "zod";
import { usPhoneDigits } from "./onlineBooking";

// Client portal → My profile (Step 2B). Error messages are translation-key
// suffixes (Portal.profile.errors.*), never displayed English text. The
// same schema runs in the browser (instant feedback) and again in
// POST /api/portal/profile, which is the one that counts.

export const bestTimeToCallValues = ["morning", "midday", "afternoon", "evening"] as const;
export type BestTimeToCall = (typeof bestTimeToCallValues)[number];

// No control characters or angle brackets (same rule as /book).
const SAFE_TEXT = /^[^\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]*$/;

export const portalProfileSchema = z.object({
  phone: z
    .string()
    .trim()
    .refine((v) => usPhoneDigits(v) !== null, "phone"),
  email: z
    .string()
    .trim()
    .max(200, "email")
    .refine((v) => v === "" || z.email().safeParse(v).success, "email"),
  address: z.string().trim().max(300, "address").regex(SAFE_TEXT, "address"),
  preferredLanguage: z.enum(["en", "es"], { message: "language" }),
  bestTimeToCall: z.enum(bestTimeToCallValues).or(z.literal("")),
});

export type PortalProfileValues = z.input<typeof portalProfileSchema>;

// Services request (Portal → Services that interest me).
export const PORTAL_SERVICE_COMMENT_MAX = 500;

export const portalServiceRequestSchema = z
  .object({
    services: z.array(z.string()).max(20),
    comment: z.string().trim().max(PORTAL_SERVICE_COMMENT_MAX, "comment").regex(SAFE_TEXT, "comment"),
  })
  .refine((v) => v.services.length > 0 || v.comment.length > 0, { message: "empty" });

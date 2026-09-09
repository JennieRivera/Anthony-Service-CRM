import { z } from "zod";

// Display order for the Communications module's channel picker — independent
// of the underlying Postgres enum's storage order (Postgres only supports
// appending new enum values, not reordering them).
export const communicationChannelValues = [
  "whatsapp",
  "email",
  "sms",
  "call",
  "facebook_messenger",
  "instagram_dm",
  "youtube",
  "tiktok",
  "linkedin",
  "website_chat",
  "highlevel",
  "in_person",
  "other",
] as const;

export const communicationDirectionValues = ["inbound", "outbound"] as const;

export const communicationStatusValues = [
  "new",
  "read",
  "replied",
  "pending_follow_up",
  "completed",
  "archived",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const communicationFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  caseId: optionalString,
  referralId: optionalString,
  // SIDEBAR-PLAN.md section 2 — completing Communications' "connects to"
  // list. Two separate optional FKs for alliances/associations rather
  // than one generic "partner" field, since those are two deliberately
  // separate tables (see the comment on associationsChambers in
  // schema.ts) — a communication links to at most one of either.
  appointmentId: optionalString,
  allianceId: optionalString,
  associationId: optionalString,
  businessName: optionalString,
  channel: z.enum(communicationChannelValues),
  direction: z.enum(communicationDirectionValues),
  occurredAt: z.string().min(1, "Date is required"),
  subject: optionalString,
  summary: z.string().trim().min(1, "Summary is required"),
  fullMessage: optionalString,
  durationMinutes: optionalString,
  counterpart: optionalString,
  status: z.enum(communicationStatusValues),
  followUpRequired: z.boolean().optional(),
  followUpDate: optionalString,
});

export type CommunicationFormValues = z.infer<typeof communicationFormSchema>;

import { z } from "zod";
import { communicationChannelValues } from "./communication";

export const messageTemplateCategoryValues = [
  "welcome",
  "appointment_confirmation",
  "appointment_reminder",
  "documents_requested",
  "documents_missing",
  "payment_reminder",
  "invoice_sent",
  "payment_received",
  "service_update",
  "referral_update",
  "rri_referral_update",
  "follow_up",
  "thank_you",
  "review_request",
  "academy_welcome",
  "academy_reminder",
  "partner_communication",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const messageTemplateFormSchema = z.object({
  name: z.string().trim().min(1, "Template name is required"),
  language: z.enum(["en", "es"]),
  channel: z.enum(communicationChannelValues),
  category: z.enum(messageTemplateCategoryValues),
  subject: optionalString,
  messageBody: z.string().trim().min(1, "Message body is required"),
  active: z.boolean().optional(),
});

export type MessageTemplateFormValues = z.infer<typeof messageTemplateFormSchema>;

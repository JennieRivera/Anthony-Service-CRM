import { z } from "zod";
import { communicationChannelValues } from "./communication";

export const whatsappContactStatusValues = [
  "not_connected",
  "connected",
  "consent_pending",
  "active",
  "opted_out",
] as const;

export const emailContactStatusValues = [
  "active",
  "unsubscribed",
  "bounced",
  "invalid",
  "consent_pending",
] as const;

export const smsContactStatusValues = [
  "active",
  "opted_out",
  "invalid",
  "consent_pending",
] as const;

export { communicationChannelValues as preferredChannelValues };

const optionalString = z.string().trim().optional().or(z.literal(""));

export const communicationPreferencesFormSchema = z.object({
  preferredChannel: z.enum(communicationChannelValues).optional().or(z.literal("")),
  emailConsent: z.boolean().optional(),
  smsConsent: z.boolean().optional(),
  whatsappConsent: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  partnerReferralConsent: z.boolean().optional(),
  consentDate: optionalString,
  consentSource: optionalString,
  optOutDate: optionalString,
  whatsappNumber: optionalString,
  whatsappContactStatus: z.enum(whatsappContactStatusValues),
  nextWhatsappFollowUpDate: optionalString,
  whatsappTemplateUsed: optionalString,
  emailStatus: z.enum(emailContactStatusValues),
  nextEmailFollowUpDate: optionalString,
  emailTemplateUsed: optionalString,
  smsStatus: z.enum(smsContactStatusValues),
  nextSmsFollowUpDate: optionalString,
  smsTemplateUsed: optionalString,
});

export type CommunicationPreferencesFormValues = z.infer<
  typeof communicationPreferencesFormSchema
>;

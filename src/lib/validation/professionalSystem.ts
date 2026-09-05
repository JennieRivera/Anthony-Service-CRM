import { z } from "zod";

export const professionalSystemConnectionStatusValues = [
  "link_only",
  "api_available",
  "webhook_available",
  "connected",
  "not_connected",
  "error",
] as const;

export const professionalSystemIntegrationTypeValues = [
  "external_link",
  "api",
  "webhook",
  "oauth",
  "manual",
  "unknown",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const professionalSystemFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  category: z.string().trim().min(1, "Category is required"),
  url: optionalString,
  icon: optionalString,
  description: optionalString,
  connectionStatus: z.enum(professionalSystemConnectionStatusValues),
  integrationType: z.enum(professionalSystemIntegrationTypeValues),
  notes: optionalString,
  active: z.boolean().optional(),
  openInNewTab: z.boolean().optional(),
});

export type ProfessionalSystemFormValues = z.infer<
  typeof professionalSystemFormSchema
>;

import { z } from "zod";

export const allianceContactRoleValues = [
  "Primary Contact",
  "Owner",
  "Billing Contact",
  "Referral Contact",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const allianceContactFormSchema = z.object({
  clientId: optionalString,
  name: z.string().trim().min(1, "Name is required"),
  role: optionalString,
  phone: optionalString,
  email: optionalString,
  notes: optionalString,
});
export type AllianceContactFormValues = z.infer<typeof allianceContactFormSchema>;

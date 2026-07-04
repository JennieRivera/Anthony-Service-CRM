import { z } from "zod";

export const serviceTypeValues = [
  "notary",
  "mobile_notary",
  "online_notary",
  "immigration",
  "tax_prep",
  "apostille",
  "document_prep",
  "credit_financing",
] as const;

export const clientStatusValues = [
  "lead",
  "active",
  "in_progress",
  "completed",
  "follow_up",
] as const;

export const clientFormSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  preferredLanguage: z.enum(["en", "es"]),
  status: z.enum(clientStatusValues),
  referralSource: z.string().trim().optional().or(z.literal("")),
  interestedServices: z.array(z.enum(serviceTypeValues)),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

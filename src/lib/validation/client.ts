import { z } from "zod";

export const serviceTypeValues = [
  "online_notary",
  "document_prep",
  "tax_prep",
  "company_registration",
  "credit_financing",
  "leadership",
  "notary",
  "bookkeeping",
  "immigration",
  "academy",
  "marketing",
  "sales_tax",
  "irs_administrative",
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
  companyId: z.string().trim().optional().or(z.literal("")),
  // Free-text document-cabinet folder label (e.g. "001"), edited by staff.
  folderNumber: z.string().trim().optional().or(z.literal("")),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

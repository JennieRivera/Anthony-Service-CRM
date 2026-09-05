import { z } from "zod";

export const companyDocumentCategoryValues = [
  "formation_documents",
  "ein_documents",
  "operating_agreement",
  "bylaws",
  "state_registration",
  "annual_report",
  "business_licenses",
  "sales_tax",
  "insurance",
  "bookkeeping",
  "tax_returns",
  "contracts",
  "financing_documents",
  "other",
] as const;

export const companyDocumentChecklistStatusValues = [
  "requested",
  "received",
  "verified",
  "expired",
  "renewal_due",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const companyDocumentChecklistItemFormSchema = z.object({
  category: z.enum(companyDocumentCategoryValues),
  description: optionalString,
  status: z.enum(companyDocumentChecklistStatusValues),
  dueDate: optionalString,
  notes: optionalString,
});
export type CompanyDocumentChecklistItemFormValues = z.infer<
  typeof companyDocumentChecklistItemFormSchema
>;

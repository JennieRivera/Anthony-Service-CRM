import { z } from "zod";

export const irsResourceCategoryValues = [
  "ein",
  "itin",
  "business_taxes",
  "employment_taxes",
  "estimated_taxes",
  "irs_forms",
  "irs_publications",
  "irs_notices",
  "irs_contact_resources",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const irsResourceFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  category: z.enum(irsResourceCategoryValues),
  url: z.string().trim().min(1, "URL is required"),
  description: optionalString,
  lastVerifiedDate: optionalString,
  verifiedBy: optionalString,
  active: z.boolean().optional(),
});
export type IrsResourceFormValues = z.infer<typeof irsResourceFormSchema>;

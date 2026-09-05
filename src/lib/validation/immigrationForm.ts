import { z } from "zod";

export const immigrationFormCategoryValues = [
  "family_based",
  "employment_based",
  "humanitarian",
  "citizenship_naturalization",
  "permanent_residence",
  "work_authorization",
  "travel_documents",
  "affidavits_supporting_forms",
  "change_of_address",
  "fee_waivers",
  "uscis_general_forms",
  "other",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const immigrationFormFormSchema = z.object({
  formNumber: z.string().trim().min(1, "Form number is required"),
  formName: z.string().trim().min(1, "Form name is required"),
  category: z.enum(immigrationFormCategoryValues),
  officialSource: optionalString,
  officialUrl: z.string().trim().min(1, "Official URL is required"),
  currentEditionDate: optionalString,
  editionNotes: optionalString,
  filingFeeReference: optionalString,
  instructionsUrl: optionalString,
  checklist: optionalString,
  internalNotes: optionalString,
  lastVerifiedDate: optionalString,
  verifiedBy: optionalString,
  active: z.boolean().optional(),
});
export type ImmigrationFormFormValues = z.infer<typeof immigrationFormFormSchema>;

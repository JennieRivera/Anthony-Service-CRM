import { z } from "zod";

export const academyCatalogStatusValues = ["draft", "active", "archived"] as const;
export const academyCourseFormatValues = ["live", "in_person", "recorded", "hybrid"] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const academyCourseFormSchema = z.object({
  programId: optionalString,
  name: z.string().trim().min(1, "Name is required"),
  description: optionalString,
  format: z.enum(academyCourseFormatValues),
  status: z.enum(academyCatalogStatusValues),
  durationText: optionalString,
  // Catalog/informational only — never read by invoice or payment logic.
  price: optionalString,
  certificateEligible: z.boolean().optional(),
  primaryInstructorId: optionalString,
  notes: optionalString,
});

export type AcademyCourseFormValues = z.infer<typeof academyCourseFormSchema>;

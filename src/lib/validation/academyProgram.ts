import { z } from "zod";

export const academyCatalogStatusValues = ["draft", "active", "archived"] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const academyProgramFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: optionalString,
  status: z.enum(academyCatalogStatusValues),
  startDate: optionalString,
  endDate: optionalString,
  durationText: optionalString,
  certificateEligible: z.boolean().optional(),
  notes: optionalString,
});

export type AcademyProgramFormValues = z.infer<typeof academyProgramFormSchema>;

import { z } from "zod";

export const academyCatalogStatusValues = ["draft", "active", "archived"] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const academyCourseModuleFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: optionalString,
  durationText: optionalString,
  status: z.enum(academyCatalogStatusValues),
});

export type AcademyCourseModuleFormValues = z.infer<typeof academyCourseModuleFormSchema>;

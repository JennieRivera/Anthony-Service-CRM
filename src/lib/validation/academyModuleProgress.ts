import { z } from "zod";

export const academyModuleProgressStatusValues = [
  "not_started",
  "in_progress",
  "completed",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const academyModuleProgressFormSchema = z.object({
  status: z.enum(academyModuleProgressStatusValues),
  notes: optionalString,
});

export type AcademyModuleProgressFormValues = z.infer<
  typeof academyModuleProgressFormSchema
>;

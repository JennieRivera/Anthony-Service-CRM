import { z } from "zod";

const optionalString = z.string().trim().optional().or(z.literal(""));

export const academyAttendanceSessionFormSchema = z.object({
  sessionDate: z.string().trim().min(1, "Session date is required"),
  title: optionalString,
  notes: optionalString,
});

export type AcademyAttendanceSessionFormValues = z.infer<
  typeof academyAttendanceSessionFormSchema
>;

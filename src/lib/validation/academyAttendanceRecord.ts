import { z } from "zod";

export const academyAttendanceStatusValues = [
  "present",
  "absent",
  "excused",
  "late",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const academyAttendanceRecordFormSchema = z.object({
  attendanceStatus: z.enum(academyAttendanceStatusValues),
  notes: optionalString,
});

export type AcademyAttendanceRecordFormValues = z.infer<
  typeof academyAttendanceRecordFormSchema
>;

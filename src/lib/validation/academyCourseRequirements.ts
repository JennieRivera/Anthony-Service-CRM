import { z } from "zod";

// Same "" -> 0 coercion pitfall as academyEvaluation.ts — see the comment
// there. An unset requirement must stay null ("Not configured"), not 0%.
const optionalCoercedPercentage = z.preprocess(
  (val) => (val === "" || val == null ? undefined : val),
  z.coerce.number().int().min(0).max(100).optional(),
);

export const academyCourseRequirementsFormSchema = z.object({
  minimumAttendancePercentage: optionalCoercedPercentage,
  minimumOverallGrade: optionalCoercedPercentage,
  requireAllActiveModulesCompleted: z.boolean().optional(),
  requireAllEvaluationsGraded: z.boolean().optional(),
});

export type AcademyCourseRequirementsFormValues = z.input<
  typeof academyCourseRequirementsFormSchema
>;

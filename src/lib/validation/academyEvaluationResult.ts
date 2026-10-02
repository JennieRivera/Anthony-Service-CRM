import { z } from "zod";

export const academyEvaluationResultStatusValues = [
  "not_submitted",
  "submitted",
  "graded",
  "excused",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

// Same "" -> 0 coercion pitfall as academyEvaluation.ts — see the comment
// there. An ungraded student's blank points field must stay unset, not
// become 0.
const optionalCoercedNonNegativeInt = z.preprocess(
  (val) => (val === "" || val == null ? undefined : val),
  z.coerce.number().int().min(0).optional(),
);

export const academyEvaluationResultFormSchema = z.object({
  pointsEarned: optionalCoercedNonNegativeInt,
  status: z.enum(academyEvaluationResultStatusValues),
  notes: optionalString,
  feedback: optionalString,
});

export type AcademyEvaluationResultFormValues = z.input<
  typeof academyEvaluationResultFormSchema
>;

import { z } from "zod";

export const academyEvaluationTypeValues = [
  "quiz",
  "exam",
  "assignment",
  "practical",
  "final_evaluation",
  "other",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

// z.coerce.number() converts "" to 0 (Number("") === 0) before an
// .optional().or(z.literal("")) fallback ever gets a chance to run, so a
// blank field would silently become 0 instead of staying unset. Stripping
// "" to undefined first, via preprocess, is what actually makes the field
// optional.
const optionalCoercedInt = (min: number, max: number) =>
  z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.coerce.number().int().min(min).max(max).optional(),
  );

export const academyEvaluationFormSchema = z.object({
  moduleId: optionalString,
  title: z.string().trim().min(1, "Title is required"),
  description: optionalString,
  evaluationType: z.enum(academyEvaluationTypeValues),
  maxPoints: z.coerce.number().int().positive("Max points must be greater than 0"),
  passingScore: optionalCoercedInt(0, 100),
  weightPercentage: optionalCoercedInt(0, 100),
  status: z.enum(["draft", "active", "archived"]),
  dueDate: optionalString,
  notes: optionalString,
});

// Input (pre-coercion) type — this is what the client constructs and
// passes to the server action, which then runs .parse() to coerce the
// numeric string fields; using the output type here would wrongly force
// the client to pre-convert maxPoints/passingScore/weightPercentage to
// numbers itself.
export type AcademyEvaluationFormValues = z.input<typeof academyEvaluationFormSchema>;

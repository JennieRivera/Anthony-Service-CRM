import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { academyCourseModules, academyEvaluations } from "@/lib/db/schema";
import type { AcademyEvaluationFormValues } from "@/lib/validation/academyEvaluation";

export async function listEvaluationsForCourse(courseId: string) {
  return getDb()
    .select({
      id: academyEvaluations.id,
      courseId: academyEvaluations.courseId,
      moduleId: academyEvaluations.moduleId,
      moduleTitle: academyCourseModules.title,
      title: academyEvaluations.title,
      description: academyEvaluations.description,
      evaluationType: academyEvaluations.evaluationType,
      maxPoints: academyEvaluations.maxPoints,
      passingScore: academyEvaluations.passingScore,
      weightPercentage: academyEvaluations.weightPercentage,
      status: academyEvaluations.status,
      dueDate: academyEvaluations.dueDate,
      notes: academyEvaluations.notes,
      createdAt: academyEvaluations.createdAt,
    })
    .from(academyEvaluations)
    .leftJoin(academyCourseModules, eq(academyEvaluations.moduleId, academyCourseModules.id))
    .where(eq(academyEvaluations.courseId, courseId))
    .orderBy(asc(academyEvaluations.createdAt));
}

// Active evaluations only — used for grade calculation and for the
// weight-cap check (an archived evaluation's weight no longer counts
// toward "total active weight", matching "ARCHIVED EVALUATIONS ... should
// not count toward current active course-grade calculations").
export async function listActiveEvaluationsForCourse(courseId: string) {
  return getDb()
    .select()
    .from(academyEvaluations)
    .where(and(eq(academyEvaluations.courseId, courseId), eq(academyEvaluations.status, "active")));
}

async function sumActiveWeight(courseId: string, excludeEvaluationId?: string) {
  const rows = await listActiveEvaluationsForCourse(courseId);
  return rows
    .filter((r) => r.id !== excludeEvaluationId)
    .reduce((sum, r) => sum + (r.weightPercentage ?? 0), 0);
}

// "Do not allow configured active evaluation weights to exceed 100%" — this
// is the one place that rule is enforced, called from both create and
// update so it can't be bypassed either way.
async function assertWeightWithinLimit(
  courseId: string,
  values: AcademyEvaluationFormValues,
  excludeEvaluationId?: string,
) {
  if (values.status !== "active") return;
  const newWeight =
    values.weightPercentage === "" || values.weightPercentage == null
      ? 0
      : Number(values.weightPercentage);
  if (newWeight === 0) return;
  const existingTotal = await sumActiveWeight(courseId, excludeEvaluationId);
  if (existingTotal + newWeight > 100) {
    throw new Error(
      `Active evaluation weights would total ${existingTotal + newWeight}%, which exceeds 100%.`,
    );
  }
}

export async function createEvaluation(courseId: string, values: AcademyEvaluationFormValues) {
  await assertWeightWithinLimit(courseId, values);
  await getDb()
    .insert(academyEvaluations)
    .values({
      courseId,
      moduleId: values.moduleId || null,
      title: values.title,
      description: values.description || null,
      evaluationType: values.evaluationType,
      maxPoints: Number(values.maxPoints),
      passingScore:
        values.passingScore === "" || values.passingScore == null
          ? null
          : Number(values.passingScore),
      weightPercentage:
        values.weightPercentage === "" || values.weightPercentage == null
          ? null
          : Number(values.weightPercentage),
      status: values.status,
      dueDate: values.dueDate || null,
      notes: values.notes || null,
    });
}

export async function updateEvaluation(
  id: string,
  courseId: string,
  values: AcademyEvaluationFormValues,
) {
  await assertWeightWithinLimit(courseId, values, id);
  await getDb()
    .update(academyEvaluations)
    .set({
      moduleId: values.moduleId || null,
      title: values.title,
      description: values.description || null,
      evaluationType: values.evaluationType,
      maxPoints: Number(values.maxPoints),
      passingScore:
        values.passingScore === "" || values.passingScore == null
          ? null
          : Number(values.passingScore),
      weightPercentage:
        values.weightPercentage === "" || values.weightPercentage == null
          ? null
          : Number(values.weightPercentage),
      status: values.status,
      dueDate: values.dueDate || null,
      notes: values.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(academyEvaluations.id, id));
}

export async function updateEvaluationStatus(
  id: string,
  courseId: string,
  status: "draft" | "active" | "archived",
) {
  if (status === "active") {
    const [row] = await getDb()
      .select({ weightPercentage: academyEvaluations.weightPercentage })
      .from(academyEvaluations)
      .where(eq(academyEvaluations.id, id))
      .limit(1);
    const weight = row?.weightPercentage ?? 0;
    if (weight > 0) {
      const existingTotal = await sumActiveWeight(courseId, id);
      if (existingTotal + weight > 100) {
        throw new Error(
          `Active evaluation weights would total ${existingTotal + weight}%, which exceeds 100%.`,
        );
      }
    }
  }
  await getDb()
    .update(academyEvaluations)
    .set({ status, updatedAt: new Date() })
    .where(eq(academyEvaluations.id, id));
}

export async function getEvaluationById(id: string) {
  const [row] = await getDb()
    .select()
    .from(academyEvaluations)
    .where(eq(academyEvaluations.id, id))
    .limit(1);
  return row ?? null;
}

// Used by the "total active weight" provisional-grade display.
export async function getActiveWeightTotal(courseId: string) {
  return sumActiveWeight(courseId);
}

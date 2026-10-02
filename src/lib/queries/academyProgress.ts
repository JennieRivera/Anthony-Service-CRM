import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { academyCourseModules, academyStudentModuleProgress } from "@/lib/db/schema";
import type { AcademyModuleProgressFormValues } from "@/lib/validation/academyModuleProgress";

// Percentage is never stored — always computed live from the course's
// currently-ACTIVE modules against this enrollment's progress rows, so a
// later-added module changes the denominator and a later-archived module
// drops out of it with no invalidation step. A progress row for a module
// that's since been archived is left in the database untouched; it just no
// longer appears in this list or counts toward the percentage.
export async function listCourseModuleProgress(enrollmentCaseId: string, courseId: string) {
  const db = getDb();

  const [modules, progressRows] = await Promise.all([
    db
      .select()
      .from(academyCourseModules)
      .where(eq(academyCourseModules.courseId, courseId))
      .orderBy(asc(academyCourseModules.moduleOrder)),
    db
      .select()
      .from(academyStudentModuleProgress)
      .where(eq(academyStudentModuleProgress.enrollmentCaseId, enrollmentCaseId)),
  ]);

  const progressByModuleId = new Map(progressRows.map((p) => [p.moduleId, p]));

  const activeModules = modules
    .filter((m) => m.status === "active")
    .map((m, index) => {
      const progress = progressByModuleId.get(m.id);
      return {
        moduleId: m.id,
        title: m.title,
        order: index + 1,
        status: progress?.status ?? ("not_started" as const),
        completedAt: progress?.completedAt ?? null,
        notes: progress?.notes ?? null,
      };
    });

  const completedCount = activeModules.filter((m) => m.status === "completed").length;
  const totalCount = activeModules.length;
  const percentage = totalCount === 0 ? null : Math.round((completedCount / totalCount) * 100);

  return { modules: activeModules, completedCount, totalCount, percentage };
}

// Lightweight variant for list/summary contexts (e.g. the Academy student
// list) that only need the numbers, not the per-module detail.
export async function getCourseProgressSummary(enrollmentCaseId: string, courseId: string) {
  const { completedCount, totalCount, percentage } = await listCourseModuleProgress(
    enrollmentCaseId,
    courseId,
  );
  return { completedCount, totalCount, percentage };
}

export async function upsertModuleProgress(
  enrollmentCaseId: string,
  courseId: string,
  moduleId: string,
  clientId: string,
  values: AcademyModuleProgressFormValues,
) {
  const db = getDb();
  const [existing] = await db
    .select({ id: academyStudentModuleProgress.id })
    .from(academyStudentModuleProgress)
    .where(
      and(
        eq(academyStudentModuleProgress.enrollmentCaseId, enrollmentCaseId),
        eq(academyStudentModuleProgress.moduleId, moduleId),
      ),
    )
    .limit(1);

  const completedAt = values.status === "completed" ? new Date() : null;

  if (existing) {
    await db
      .update(academyStudentModuleProgress)
      .set({
        status: values.status,
        notes: values.notes || null,
        completedAt,
        updatedAt: new Date(),
      })
      .where(eq(academyStudentModuleProgress.id, existing.id));
    return;
  }

  await db.insert(academyStudentModuleProgress).values({
    enrollmentCaseId,
    courseId,
    moduleId,
    clientId,
    status: values.status,
    notes: values.notes || null,
    completedAt,
  });
}

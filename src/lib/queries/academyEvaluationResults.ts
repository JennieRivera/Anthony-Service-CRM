import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { academyEvaluationResults, type AcademyCourse } from "@/lib/db/schema";
import {
  listEnrollmentsForCourse,
  getAttendanceSummaryForEnrollment,
} from "@/lib/queries/academyAttendance";
import {
  listActiveEvaluationsForCourse,
  listEvaluationsForCourse,
} from "@/lib/queries/academyEvaluations";
import { listCourseModuleProgress } from "@/lib/queries/academyProgress";
import type { AcademyEvaluationResultFormValues } from "@/lib/validation/academyEvaluationResult";

// percentageScore is never stored — always derived here from pointsEarned /
// evaluation.maxPoints, same principle as Phase 2D's progress/attendance
// percentages. Returns null when not yet graded (pointsEarned is null) or
// maxPoints is 0 (guarded against at evaluation-creation time, but checked
// again here defensively).
export function computePercentageScore(
  pointsEarned: number | null,
  maxPoints: number,
): number | null {
  if (pointsEarned == null || maxPoints <= 0) return null;
  return Math.round((pointsEarned / maxPoints) * 100);
}

// "Passed" / "Not Passed" per the exact wording required — never "Failed".
// Returns null (no verdict) when the evaluation has no passingScore
// configured, so the UI shows the score only.
export function computePassStatus(
  percentageScore: number | null,
  passingScore: number | null,
): "passed" | "not_passed" | null {
  if (percentageScore == null || passingScore == null) return null;
  return percentageScore >= passingScore ? "passed" : "not_passed";
}

// Roster for one evaluation — enrolled students left-joined against any
// existing result, mirroring listAttendanceForSession in academyAttendance.ts.
export async function listResultsForEvaluation(evaluationId: string, courseId: string) {
  const db = getDb();
  const [roster, results] = await Promise.all([
    listEnrollmentsForCourse(courseId),
    db
      .select()
      .from(academyEvaluationResults)
      .where(eq(academyEvaluationResults.evaluationId, evaluationId)),
  ]);

  const resultByEnrollment = new Map(results.map((r) => [r.enrollmentCaseId, r]));

  return roster.map((student) => {
    const result = resultByEnrollment.get(student.enrollmentCaseId);
    return {
      ...student,
      pointsEarned: result?.pointsEarned ?? null,
      status: result?.status ?? "not_submitted",
      gradedAt: result?.gradedAt ?? null,
      feedback: result?.feedback ?? null,
      notes: result?.notes ?? null,
    };
  });
}

export async function upsertEvaluationResult(
  evaluationId: string,
  enrollmentCaseId: string,
  clientId: string,
  maxPoints: number,
  values: AcademyEvaluationResultFormValues,
) {
  const db = getDb();

  const rawPoints =
    values.pointsEarned === "" || values.pointsEarned == null ? null : Number(values.pointsEarned);
  // "Do not allow points earned above max points in this phase."
  const pointsEarned =
    rawPoints == null ? null : Math.max(0, Math.min(rawPoints, maxPoints));

  const gradedAt = values.status === "graded" ? new Date() : null;

  const [existing] = await db
    .select({ id: academyEvaluationResults.id })
    .from(academyEvaluationResults)
    .where(
      and(
        eq(academyEvaluationResults.evaluationId, evaluationId),
        eq(academyEvaluationResults.enrollmentCaseId, enrollmentCaseId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(academyEvaluationResults)
      .set({
        pointsEarned,
        status: values.status,
        gradedAt,
        notes: values.notes || null,
        feedback: values.feedback || null,
        updatedAt: new Date(),
      })
      .where(eq(academyEvaluationResults.id, existing.id));
    return;
  }

  await db.insert(academyEvaluationResults).values({
    evaluationId,
    enrollmentCaseId,
    clientId,
    pointsEarned,
    status: values.status,
    gradedAt,
    notes: values.notes || null,
    feedback: values.feedback || null,
  });
}

// All active evaluations for the course, each with this enrollment's result
// (or a default "not_submitted" placeholder) — feeds the enrollment detail
// Evaluations section.
export async function listEvaluationsWithResultForEnrollment(
  enrollmentCaseId: string,
  courseId: string,
) {
  const db = getDb();
  const [evaluations, results] = await Promise.all([
    listEvaluationsForCourse(courseId).catch(() => []),
    db
      .select()
      .from(academyEvaluationResults)
      .where(eq(academyEvaluationResults.enrollmentCaseId, enrollmentCaseId)),
  ]);

  const resultByEvaluation = new Map(results.map((r) => [r.evaluationId, r]));

  return evaluations
    .filter((e) => e.status === "active")
    .map((e) => {
      const result = resultByEvaluation.get(e.id);
      const pointsEarned = result?.pointsEarned ?? null;
      const percentageScore = computePercentageScore(pointsEarned, e.maxPoints);
      return {
        evaluationId: e.id,
        title: e.title,
        evaluationType: e.evaluationType,
        moduleTitle: e.moduleTitle,
        maxPoints: e.maxPoints,
        passingScore: e.passingScore,
        dueDate: e.dueDate,
        pointsEarned,
        percentageScore,
        passStatus: computePassStatus(percentageScore, e.passingScore),
        status: result?.status ?? ("not_submitted" as const),
        gradedAt: result?.gradedAt ?? null,
        feedback: result?.feedback ?? null,
      };
    });
}

// Overall grade calculation — see "SCORE CALCULATION" / "COURSE GRADE" in
// the Phase 2E spec. Weighted mode is used when at least one active
// evaluation has a weightPercentage configured; the grade itself is
// weighted among GRADED evaluations only (can't factor in an ungraded
// score), while the "provisional" flag is driven by the configured total
// active weight across ALL active evaluations (graded or not) — exactly
// the "provisional until total active weight = 100%" rule, never silently
// normalized.
export async function computeOverallGrade(enrollmentCaseId: string, courseId: string) {
  const [activeEvaluations, results] = await Promise.all([
    listActiveEvaluationsForCourse(courseId),
    getDb()
      .select()
      .from(academyEvaluationResults)
      .where(eq(academyEvaluationResults.enrollmentCaseId, enrollmentCaseId)),
  ]);

  const resultByEvaluation = new Map(results.map((r) => [r.evaluationId, r]));
  const hasWeights = activeEvaluations.some((e) => (e.weightPercentage ?? 0) > 0);

  const gradedEntries = activeEvaluations
    .map((e) => {
      const result = resultByEvaluation.get(e.id);
      const percentageScore = computePercentageScore(result?.pointsEarned ?? null, e.maxPoints);
      return { evaluation: e, percentageScore, graded: result?.status === "graded" && percentageScore != null };
    })
    .filter((entry) => entry.graded);

  const gradedCount = gradedEntries.filter((e) => e.graded).length;
  const totalActive = activeEvaluations.length;
  const totalActiveWeight = activeEvaluations.reduce(
    (sum, e) => sum + (e.weightPercentage ?? 0),
    0,
  );

  let grade: number | null = null;
  if (gradedEntries.length > 0) {
    if (hasWeights) {
      const weightSum = gradedEntries.reduce(
        (sum, e) => sum + (e.evaluation.weightPercentage ?? 0),
        0,
      );
      if (weightSum > 0) {
        grade = Math.round(
          gradedEntries.reduce(
            (sum, e) => sum + (e.percentageScore ?? 0) * (e.evaluation.weightPercentage ?? 0),
            0,
          ) / weightSum,
        );
      }
    } else {
      grade = Math.round(
        gradedEntries.reduce((sum, e) => sum + (e.percentageScore ?? 0), 0) / gradedEntries.length,
      );
    }
  }

  return {
    grade,
    hasWeights,
    provisional: hasWeights && totalActiveWeight < 100,
    totalActiveWeight,
    gradedCount,
    totalActive,
  };
}

// Course completion/readiness summary — never auto-issues a certificate,
// purely informational. Reuses Phase 2D's progress/attendance queries
// instead of duplicating that logic ("ATTENDANCE + PROGRESS INTEGRATION").
export async function getCourseReadinessSummary(
  enrollmentCaseId: string,
  course: Pick<
    AcademyCourse,
    | "id"
    | "minimumAttendancePercentage"
    | "minimumOverallGrade"
    | "requireAllActiveModulesCompleted"
    | "requireAllEvaluationsGraded"
  >,
) {
  const [progress, attendance, gradeInfo] = await Promise.all([
    listCourseModuleProgress(enrollmentCaseId, course.id),
    getAttendanceSummaryForEnrollment(enrollmentCaseId),
    computeOverallGrade(enrollmentCaseId, course.id),
  ]);

  const modulesComplete =
    progress.totalCount > 0 && progress.completedCount === progress.totalCount;
  const evaluationsComplete =
    gradeInfo.totalActive > 0 && gradeInfo.gradedCount === gradeInfo.totalActive;

  const requirements = {
    minimumAttendance:
      course.minimumAttendancePercentage == null
        ? null
        : (attendance.percentage ?? 0) >= course.minimumAttendancePercentage,
    minimumGrade:
      course.minimumOverallGrade == null
        ? null
        : (gradeInfo.grade ?? 0) >= course.minimumOverallGrade,
    allModulesCompleted: course.requireAllActiveModulesCompleted ? modulesComplete : null,
    allEvaluationsGraded: course.requireAllEvaluationsGraded ? evaluationsComplete : null,
  };

  return { progress, attendance, gradeInfo, requirements };
}

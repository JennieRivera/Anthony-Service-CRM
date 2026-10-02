"use server";

import { revalidatePath } from "next/cache";
import type { AcademyCourse, AcademyCourseModule } from "@/lib/db/schema";
import {
  academyCourseFormSchema,
  type AcademyCourseFormValues,
} from "@/lib/validation/academyCourse";
import {
  academyCourseModuleFormSchema,
  type AcademyCourseModuleFormValues,
} from "@/lib/validation/academyCourseModule";
import {
  createAcademyCourse,
  updateAcademyCourse,
  updateAcademyCourseStatus,
} from "@/lib/queries/academyCourses";
import {
  createAcademyCourseModule,
  updateAcademyCourseModule,
  updateAcademyCourseModuleStatus,
  reorderAcademyCourseModule,
} from "@/lib/queries/academyCourseModules";
import {
  createAttendanceSession,
  updateAttendanceSession,
  upsertAttendanceRecord,
  listAttendanceForSession,
} from "@/lib/queries/academyAttendance";
import {
  academyAttendanceSessionFormSchema,
  type AcademyAttendanceSessionFormValues,
} from "@/lib/validation/academyAttendanceSession";
import {
  academyAttendanceRecordFormSchema,
  type AcademyAttendanceRecordFormValues,
} from "@/lib/validation/academyAttendanceRecord";
import {
  createEvaluation,
  updateEvaluation,
  updateEvaluationStatus,
} from "@/lib/queries/academyEvaluations";
import {
  academyEvaluationFormSchema,
  type AcademyEvaluationFormValues,
} from "@/lib/validation/academyEvaluation";
import {
  listResultsForEvaluation,
  upsertEvaluationResult,
} from "@/lib/queries/academyEvaluationResults";
import {
  academyEvaluationResultFormSchema,
  type AcademyEvaluationResultFormValues,
} from "@/lib/validation/academyEvaluationResult";
import { updateAcademyCourseRequirements } from "@/lib/queries/academyCourses";
import {
  academyCourseRequirementsFormSchema,
  type AcademyCourseRequirementsFormValues,
} from "@/lib/validation/academyCourseRequirements";

export async function createAcademyCourseAction(rawValues: AcademyCourseFormValues) {
  const values = academyCourseFormSchema.parse(rawValues);
  await createAcademyCourse(values);
  revalidatePath("/academy/courses");
}

export async function updateAcademyCourseAction(
  id: string,
  rawValues: AcademyCourseFormValues,
) {
  const values = academyCourseFormSchema.parse(rawValues);
  await updateAcademyCourse(id, values);
  revalidatePath("/academy/courses");
  revalidatePath(`/academy/courses/${id}`);
}

export async function updateAcademyCourseStatusAction(
  id: string,
  status: AcademyCourse["status"],
) {
  await updateAcademyCourseStatus(id, status);
  revalidatePath("/academy/courses");
  revalidatePath(`/academy/courses/${id}`);
}

export async function createAcademyCourseModuleAction(
  courseId: string,
  rawValues: AcademyCourseModuleFormValues,
) {
  const values = academyCourseModuleFormSchema.parse(rawValues);
  await createAcademyCourseModule(courseId, values);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function updateAcademyCourseModuleAction(
  courseId: string,
  id: string,
  rawValues: AcademyCourseModuleFormValues,
) {
  const values = academyCourseModuleFormSchema.parse(rawValues);
  await updateAcademyCourseModule(id, values);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function updateAcademyCourseModuleStatusAction(
  courseId: string,
  id: string,
  status: AcademyCourseModule["status"],
) {
  await updateAcademyCourseModuleStatus(id, status);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function reorderAcademyCourseModuleAction(
  courseId: string,
  id: string,
  direction: "up" | "down",
) {
  await reorderAcademyCourseModule(courseId, id, direction);
  revalidatePath(`/academy/courses/${courseId}`);
}

// Phase 2D — Attendance sessions and per-student records, both marked from
// the course detail page.
export async function createAttendanceSessionAction(
  courseId: string,
  rawValues: AcademyAttendanceSessionFormValues,
) {
  const values = academyAttendanceSessionFormSchema.parse(rawValues);
  await createAttendanceSession(courseId, values);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function updateAttendanceSessionAction(
  courseId: string,
  sessionId: string,
  rawValues: AcademyAttendanceSessionFormValues,
) {
  const values = academyAttendanceSessionFormSchema.parse(rawValues);
  await updateAttendanceSession(sessionId, values);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function getAttendanceRosterAction(courseId: string, sessionId: string) {
  return listAttendanceForSession(sessionId, courseId);
}

export async function markAttendanceAction(
  courseId: string,
  sessionId: string,
  enrollmentCaseId: string,
  rawValues: AcademyAttendanceRecordFormValues,
) {
  const values = academyAttendanceRecordFormSchema.parse(rawValues);
  await upsertAttendanceRecord(sessionId, enrollmentCaseId, values);
  revalidatePath(`/academy/courses/${courseId}`);
  revalidatePath(`/cases/${enrollmentCaseId}`);
}

// Phase 2E — Evaluations and grading, managed from the course detail page.
// createEvaluation/updateEvaluation/updateEvaluationStatus each throw a
// plain Error when the active-weight cap (100%) would be exceeded; these
// actions let that propagate so the calling dialog's catch block can show
// it as a save error, same pattern as every other dialog in this app.
export async function createAcademyEvaluationAction(
  courseId: string,
  rawValues: AcademyEvaluationFormValues,
) {
  const values = academyEvaluationFormSchema.parse(rawValues);
  await createEvaluation(courseId, values);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function updateAcademyEvaluationAction(
  courseId: string,
  id: string,
  rawValues: AcademyEvaluationFormValues,
) {
  const values = academyEvaluationFormSchema.parse(rawValues);
  await updateEvaluation(id, courseId, values);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function updateAcademyEvaluationStatusAction(
  courseId: string,
  id: string,
  status: "draft" | "active" | "archived",
) {
  await updateEvaluationStatus(id, courseId, status);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function getEvaluationRosterAction(evaluationId: string, courseId: string) {
  return listResultsForEvaluation(evaluationId, courseId);
}

export async function gradeStudentAction(
  courseId: string,
  evaluationId: string,
  enrollmentCaseId: string,
  clientId: string,
  maxPoints: number,
  rawValues: AcademyEvaluationResultFormValues,
) {
  const values = academyEvaluationResultFormSchema.parse(rawValues);
  await upsertEvaluationResult(evaluationId, enrollmentCaseId, clientId, maxPoints, values);
  revalidatePath(`/academy/courses/${courseId}`);
  revalidatePath(`/cases/${enrollmentCaseId}`);
}

// Phase 2E — optional course completion/readiness requirements.
export async function updateAcademyCourseRequirementsAction(
  courseId: string,
  rawValues: AcademyCourseRequirementsFormValues,
) {
  const values = academyCourseRequirementsFormSchema.parse(rawValues);
  await updateAcademyCourseRequirements(courseId, values);
  revalidatePath(`/academy/courses/${courseId}`);
}

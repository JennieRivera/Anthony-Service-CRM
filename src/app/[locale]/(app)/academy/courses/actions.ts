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
import { requireAccessArea } from "@/lib/permissions";

export async function createAcademyCourseAction(rawValues: AcademyCourseFormValues) {
  await requireAccessArea("academy");
  const values = academyCourseFormSchema.parse(rawValues);
  await createAcademyCourse(values);
  revalidatePath("/academy/courses");
}

export async function updateAcademyCourseAction(
  id: string,
  rawValues: AcademyCourseFormValues,
) {
  await requireAccessArea("academy");
  const values = academyCourseFormSchema.parse(rawValues);
  await updateAcademyCourse(id, values);
  revalidatePath("/academy/courses");
  revalidatePath(`/academy/courses/${id}`);
}

export async function updateAcademyCourseStatusAction(
  id: string,
  status: AcademyCourse["status"],
) {
  await requireAccessArea("academy");
  await updateAcademyCourseStatus(id, status);
  revalidatePath("/academy/courses");
  revalidatePath(`/academy/courses/${id}`);
}

export async function createAcademyCourseModuleAction(
  courseId: string,
  rawValues: AcademyCourseModuleFormValues,
) {
  await requireAccessArea("academy");
  const values = academyCourseModuleFormSchema.parse(rawValues);
  await createAcademyCourseModule(courseId, values);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function updateAcademyCourseModuleAction(
  courseId: string,
  id: string,
  rawValues: AcademyCourseModuleFormValues,
) {
  await requireAccessArea("academy");
  const values = academyCourseModuleFormSchema.parse(rawValues);
  await updateAcademyCourseModule(id, values);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function updateAcademyCourseModuleStatusAction(
  courseId: string,
  id: string,
  status: AcademyCourseModule["status"],
) {
  await requireAccessArea("academy");
  await updateAcademyCourseModuleStatus(id, status);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function reorderAcademyCourseModuleAction(
  courseId: string,
  id: string,
  direction: "up" | "down",
) {
  await requireAccessArea("academy");
  await reorderAcademyCourseModule(courseId, id, direction);
  revalidatePath(`/academy/courses/${courseId}`);
}

// Phase 2D — Attendance sessions and per-student records, both marked from
// the course detail page.
export async function createAttendanceSessionAction(
  courseId: string,
  rawValues: AcademyAttendanceSessionFormValues,
) {
  await requireAccessArea("academy");
  const values = academyAttendanceSessionFormSchema.parse(rawValues);
  await createAttendanceSession(courseId, values);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function updateAttendanceSessionAction(
  courseId: string,
  sessionId: string,
  rawValues: AcademyAttendanceSessionFormValues,
) {
  await requireAccessArea("academy");
  const values = academyAttendanceSessionFormSchema.parse(rawValues);
  await updateAttendanceSession(sessionId, values);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function getAttendanceRosterAction(courseId: string, sessionId: string) {
  await requireAccessArea("academy");
  return listAttendanceForSession(sessionId, courseId);
}

// Phase 2H — section 5 explicitly names attendance modification as
// needing explicit server-side protection, not just a hidden button.
export async function markAttendanceAction(
  courseId: string,
  sessionId: string,
  enrollmentCaseId: string,
  rawValues: AcademyAttendanceRecordFormValues,
) {
  await requireAccessArea("academy");
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
  await requireAccessArea("academy");
  const values = academyEvaluationFormSchema.parse(rawValues);
  await createEvaluation(courseId, values);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function updateAcademyEvaluationAction(
  courseId: string,
  id: string,
  rawValues: AcademyEvaluationFormValues,
) {
  await requireAccessArea("academy");
  const values = academyEvaluationFormSchema.parse(rawValues);
  await updateEvaluation(id, courseId, values);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function updateAcademyEvaluationStatusAction(
  courseId: string,
  id: string,
  status: "draft" | "active" | "archived",
) {
  await requireAccessArea("academy");
  await updateEvaluationStatus(id, courseId, status);
  revalidatePath(`/academy/courses/${courseId}`);
}

export async function getEvaluationRosterAction(evaluationId: string, courseId: string) {
  await requireAccessArea("academy");
  return listResultsForEvaluation(evaluationId, courseId);
}

// Phase 2H — section 5 explicitly names grade modification as needing
// explicit server-side protection, not just a hidden button.
export async function gradeStudentAction(
  courseId: string,
  evaluationId: string,
  enrollmentCaseId: string,
  clientId: string,
  maxPoints: number,
  rawValues: AcademyEvaluationResultFormValues,
) {
  await requireAccessArea("academy");
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
  await requireAccessArea("academy");
  const values = academyCourseRequirementsFormSchema.parse(rawValues);
  await updateAcademyCourseRequirements(courseId, values);
  revalidatePath(`/academy/courses/${courseId}`);
}

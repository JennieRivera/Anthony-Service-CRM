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

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

"use server";

import { revalidatePath } from "next/cache";
import type { AcademyInstructor } from "@/lib/db/schema";
import {
  academyInstructorFormSchema,
  type AcademyInstructorFormValues,
} from "@/lib/validation/academyInstructor";
import {
  createAcademyInstructor,
  updateAcademyInstructor,
  updateAcademyInstructorStatus,
  findAcademyInstructorByClientId,
} from "@/lib/queries/academyInstructors";
import { requireAccessArea } from "@/lib/permissions";

// Phase 2B.1 — Duplicate Role Safety. Checked at link-time in the UI
// (before clientId is ever set on the form) so staff see the warning
// immediately, not only after attempting to save.
export async function findAcademyInstructorByClientIdAction(clientId: string) {
  await requireAccessArea("academy");
  return findAcademyInstructorByClientId(clientId);
}

export async function createAcademyInstructorAction(
  rawValues: AcademyInstructorFormValues,
) {
  await requireAccessArea("academy");
  const values = academyInstructorFormSchema.parse(rawValues);
  await createAcademyInstructor(values);
  revalidatePath("/academy/instructors");
}

export async function updateAcademyInstructorAction(
  id: string,
  rawValues: AcademyInstructorFormValues,
) {
  await requireAccessArea("academy");
  const values = academyInstructorFormSchema.parse(rawValues);
  await updateAcademyInstructor(id, values);
  revalidatePath("/academy/instructors");
}

// "Deactivate" is a status change, never a delete — same posture as
// Diamond Community and every other roster in this CRM.
export async function updateAcademyInstructorStatusAction(
  id: string,
  status: AcademyInstructor["status"],
) {
  await requireAccessArea("academy");
  await updateAcademyInstructorStatus(id, status);
  revalidatePath("/academy/instructors");
}

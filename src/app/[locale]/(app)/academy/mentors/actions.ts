"use server";

import { revalidatePath } from "next/cache";
import type { AcademyMentor } from "@/lib/db/schema";
import {
  academyMentorFormSchema,
  type AcademyMentorFormValues,
} from "@/lib/validation/academyMentor";
import {
  createAcademyMentor,
  updateAcademyMentor,
  updateAcademyMentorStatus,
  findAcademyMentorByClientId,
} from "@/lib/queries/academyMentors";
import { requireAccessArea } from "@/lib/permissions";

// Phase 2B.1 — Duplicate Role Safety. See the matching comment in
// academy/instructors/actions.ts.
export async function findAcademyMentorByClientIdAction(clientId: string) {
  await requireAccessArea("academy");
  return findAcademyMentorByClientId(clientId);
}

export async function createAcademyMentorAction(rawValues: AcademyMentorFormValues) {
  await requireAccessArea("academy");
  const values = academyMentorFormSchema.parse(rawValues);
  await createAcademyMentor(values);
  revalidatePath("/academy/mentors");
}

export async function updateAcademyMentorAction(
  id: string,
  rawValues: AcademyMentorFormValues,
) {
  await requireAccessArea("academy");
  const values = academyMentorFormSchema.parse(rawValues);
  await updateAcademyMentor(id, values);
  revalidatePath("/academy/mentors");
}

export async function updateAcademyMentorStatusAction(
  id: string,
  status: AcademyMentor["status"],
) {
  await requireAccessArea("academy");
  await updateAcademyMentorStatus(id, status);
  revalidatePath("/academy/mentors");
}

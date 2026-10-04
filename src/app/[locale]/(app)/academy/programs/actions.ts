"use server";

import { revalidatePath } from "next/cache";
import type { AcademyProgram } from "@/lib/db/schema";
import {
  academyProgramFormSchema,
  type AcademyProgramFormValues,
} from "@/lib/validation/academyProgram";
import {
  createAcademyProgram,
  updateAcademyProgram,
  updateAcademyProgramStatus,
} from "@/lib/queries/academyPrograms";
import { requireAccessArea } from "@/lib/permissions";

export async function createAcademyProgramAction(rawValues: AcademyProgramFormValues) {
  await requireAccessArea("academy");
  const values = academyProgramFormSchema.parse(rawValues);
  await createAcademyProgram(values);
  revalidatePath("/academy/programs");
}

export async function updateAcademyProgramAction(
  id: string,
  rawValues: AcademyProgramFormValues,
) {
  await requireAccessArea("academy");
  const values = academyProgramFormSchema.parse(rawValues);
  await updateAcademyProgram(id, values);
  revalidatePath("/academy/programs");
}

// Archive/reactivate is a status change, never a delete — same posture as
// every other catalog/roster in this CRM.
export async function updateAcademyProgramStatusAction(
  id: string,
  status: AcademyProgram["status"],
) {
  await requireAccessArea("academy");
  await updateAcademyProgramStatus(id, status);
  revalidatePath("/academy/programs");
}

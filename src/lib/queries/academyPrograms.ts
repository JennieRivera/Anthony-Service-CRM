import { desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { academyPrograms, academyCourses } from "@/lib/db/schema";
import type { AcademyProgramFormValues } from "@/lib/validation/academyProgram";

export async function listAcademyPrograms() {
  return getDb()
    .select()
    .from(academyPrograms)
    .orderBy(desc(academyPrograms.createdAt));
}

// Feeds the Course form's Program picker and the Case form's catalog
// picker — excludes archived programs so retired programs quietly stop
// being offered for new assignments without ever being deleted.
export async function listSelectableAcademyPrograms() {
  return getDb()
    .select({ id: academyPrograms.id, name: academyPrograms.name, status: academyPrograms.status })
    .from(academyPrograms)
    .where(ne(academyPrograms.status, "archived"))
    .orderBy(academyPrograms.name);
}

export async function countCoursesByProgram(programId: string) {
  const rows = await getDb()
    .select({ id: academyCourses.id })
    .from(academyCourses)
    .where(eq(academyCourses.programId, programId));
  return rows.length;
}

export async function createAcademyProgram(values: AcademyProgramFormValues) {
  await getDb()
    .insert(academyPrograms)
    .values({
      name: values.name,
      description: values.description || null,
      status: values.status,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      durationText: values.durationText || null,
      certificateEligible: values.certificateEligible ?? false,
      notes: values.notes || null,
    });
}

export async function updateAcademyProgram(id: string, values: AcademyProgramFormValues) {
  await getDb()
    .update(academyPrograms)
    .set({
      name: values.name,
      description: values.description || null,
      status: values.status,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      durationText: values.durationText || null,
      certificateEligible: values.certificateEligible ?? false,
      notes: values.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(academyPrograms.id, id));
}

export async function updateAcademyProgramStatus(
  id: string,
  status: AcademyProgramFormValues["status"],
) {
  await getDb()
    .update(academyPrograms)
    .set({ status, updatedAt: new Date() })
    .where(eq(academyPrograms.id, id));
}

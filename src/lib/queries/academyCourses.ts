import { desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { academyCourses, academyPrograms, academyInstructors, clients } from "@/lib/db/schema";
import type { AcademyCourseFormValues } from "@/lib/validation/academyCourse";

// Instructor display name resolves the same way everywhere in Academy:
// linked client's name when set, else the instructor's own free-text name.
export async function listAcademyCourses() {
  return getDb()
    .select({
      id: academyCourses.id,
      programId: academyCourses.programId,
      programName: academyPrograms.name,
      name: academyCourses.name,
      description: academyCourses.description,
      format: academyCourses.format,
      status: academyCourses.status,
      durationText: academyCourses.durationText,
      price: academyCourses.price,
      certificateEligible: academyCourses.certificateEligible,
      primaryInstructorId: academyCourses.primaryInstructorId,
      notes: academyCourses.notes,
      instructorClientName: clients.fullName,
      instructorName: academyInstructors.name,
      createdAt: academyCourses.createdAt,
    })
    .from(academyCourses)
    .leftJoin(academyPrograms, eq(academyCourses.programId, academyPrograms.id))
    .leftJoin(academyInstructors, eq(academyCourses.primaryInstructorId, academyInstructors.id))
    .leftJoin(clients, eq(academyInstructors.clientId, clients.id))
    .orderBy(desc(academyCourses.createdAt));
}

// Feeds the Case form's catalog picker — excludes archived courses.
export async function listSelectableAcademyCourses() {
  return getDb()
    .select({
      id: academyCourses.id,
      name: academyCourses.name,
      programId: academyCourses.programId,
      status: academyCourses.status,
    })
    .from(academyCourses)
    .where(ne(academyCourses.status, "archived"))
    .orderBy(academyCourses.name);
}

export async function createAcademyCourse(values: AcademyCourseFormValues) {
  await getDb()
    .insert(academyCourses)
    .values({
      programId: values.programId || null,
      name: values.name,
      description: values.description || null,
      format: values.format,
      status: values.status,
      durationText: values.durationText || null,
      price: values.price || null,
      certificateEligible: values.certificateEligible ?? false,
      primaryInstructorId: values.primaryInstructorId || null,
      notes: values.notes || null,
    });
}

export async function updateAcademyCourse(id: string, values: AcademyCourseFormValues) {
  await getDb()
    .update(academyCourses)
    .set({
      programId: values.programId || null,
      name: values.name,
      description: values.description || null,
      format: values.format,
      status: values.status,
      durationText: values.durationText || null,
      price: values.price || null,
      certificateEligible: values.certificateEligible ?? false,
      primaryInstructorId: values.primaryInstructorId || null,
      notes: values.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(academyCourses.id, id));
}

export async function updateAcademyCourseStatus(
  id: string,
  status: AcademyCourseFormValues["status"],
) {
  await getDb()
    .update(academyCourses)
    .set({ status, updatedAt: new Date() })
    .where(eq(academyCourses.id, id));
}

export async function getAcademyCourseById(id: string) {
  const [row] = await getDb()
    .select({
      id: academyCourses.id,
      programId: academyCourses.programId,
      programName: academyPrograms.name,
      name: academyCourses.name,
      description: academyCourses.description,
      format: academyCourses.format,
      status: academyCourses.status,
      durationText: academyCourses.durationText,
      price: academyCourses.price,
      certificateEligible: academyCourses.certificateEligible,
      primaryInstructorId: academyCourses.primaryInstructorId,
      instructorClientName: clients.fullName,
      instructorName: academyInstructors.name,
    })
    .from(academyCourses)
    .leftJoin(academyPrograms, eq(academyCourses.programId, academyPrograms.id))
    .leftJoin(academyInstructors, eq(academyCourses.primaryInstructorId, academyInstructors.id))
    .leftJoin(clients, eq(academyInstructors.clientId, clients.id))
    .where(eq(academyCourses.id, id))
    .limit(1);
  return row ?? null;
}

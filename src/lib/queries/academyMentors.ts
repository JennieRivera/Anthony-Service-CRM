import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { academyMentors, clients } from "@/lib/db/schema";
import type { AcademyMentorFormValues } from "@/lib/validation/academyMentor";

export async function listAcademyMentors() {
  return getDb()
    .select({
      id: academyMentors.id,
      clientId: academyMentors.clientId,
      clientName: clients.fullName,
      name: academyMentors.name,
      email: academyMentors.email,
      phone: academyMentors.phone,
      focusArea: academyMentors.focusArea,
      notes: academyMentors.notes,
      startDate: academyMentors.startDate,
      status: academyMentors.status,
    })
    .from(academyMentors)
    .leftJoin(clients, eq(academyMentors.clientId, clients.id))
    .orderBy(desc(academyMentors.createdAt));
}

// Phase 2B.1 — Duplicate Role Safety. Same shape/purpose as
// findAcademyInstructorByClientId: scoped to academy_mentors only — a
// person already being an Instructor or Diamond member is never a
// conflict here.
export async function findAcademyMentorByClientId(clientId: string) {
  const [row] = await getDb()
    .select({
      id: academyMentors.id,
      clientId: academyMentors.clientId,
      clientName: clients.fullName,
      name: academyMentors.name,
      email: academyMentors.email,
      phone: academyMentors.phone,
      focusArea: academyMentors.focusArea,
      notes: academyMentors.notes,
      startDate: academyMentors.startDate,
      status: academyMentors.status,
    })
    .from(academyMentors)
    .leftJoin(clients, eq(academyMentors.clientId, clients.id))
    .where(eq(academyMentors.clientId, clientId))
    .limit(1);
  return row ?? null;
}

export async function createAcademyMentor(values: AcademyMentorFormValues) {
  const db = getDb();
  if (values.clientId) {
    const existing = await findAcademyMentorByClientId(values.clientId);
    if (existing) {
      throw new Error("This person is already an Academy Mentor.");
    }
  }
  await db.insert(academyMentors).values({
    clientId: values.clientId || null,
    name: values.name || null,
    email: values.email || null,
    phone: values.phone || null,
    focusArea: values.focusArea || null,
    notes: values.notes || null,
    startDate: values.startDate || null,
    status: values.status,
  });
}

export async function updateAcademyMentor(id: string, values: AcademyMentorFormValues) {
  const db = getDb();
  if (values.clientId) {
    const existing = await findAcademyMentorByClientId(values.clientId);
    if (existing && existing.id !== id) {
      throw new Error("This person is already an Academy Mentor.");
    }
  }
  await db
    .update(academyMentors)
    .set({
      clientId: values.clientId || null,
      name: values.name || null,
      email: values.email || null,
      phone: values.phone || null,
      focusArea: values.focusArea || null,
      notes: values.notes || null,
      startDate: values.startDate || null,
      status: values.status,
      updatedAt: new Date(),
    })
    .where(eq(academyMentors.id, id));
}

export async function updateAcademyMentorStatus(
  id: string,
  status: AcademyMentorFormValues["status"],
) {
  const db = getDb();
  await db
    .update(academyMentors)
    .set({ status, updatedAt: new Date() })
    .where(eq(academyMentors.id, id));
}

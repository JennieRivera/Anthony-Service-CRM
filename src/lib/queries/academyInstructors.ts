import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { academyInstructors, clients } from "@/lib/db/schema";
import type { AcademyInstructorFormValues } from "@/lib/validation/academyInstructor";

// Phase 2B — display name/email/phone/status always resolve from the
// linked client when clientId is set (clients.fullName kept current by the
// Clients module itself), falling back to this row's own free-text fields
// otherwise — same join pattern as listDiamondMembers in academyDiamond.ts.
export async function listAcademyInstructors() {
  return getDb()
    .select({
      id: academyInstructors.id,
      clientId: academyInstructors.clientId,
      clientName: clients.fullName,
      name: academyInstructors.name,
      email: academyInstructors.email,
      phone: academyInstructors.phone,
      title: academyInstructors.title,
      specialty: academyInstructors.specialty,
      bio: academyInstructors.bio,
      startDate: academyInstructors.startDate,
      status: academyInstructors.status,
    })
    .from(academyInstructors)
    .leftJoin(clients, eq(academyInstructors.clientId, clients.id))
    .orderBy(desc(academyInstructors.createdAt));
}

// Phase 2B.1 — Duplicate Role Safety. Looks up whether a client already
// has an academy_instructors row, so staff can be warned before a second
// one is created for the same person. Returns the same shape as
// listAcademyInstructors() so the result can be used directly as the
// "View/Edit Existing Instructor" target. Scoped to THIS table only — a
// person already being a Mentor or Diamond member is never a conflict.
export async function findAcademyInstructorByClientId(clientId: string) {
  const [row] = await getDb()
    .select({
      id: academyInstructors.id,
      clientId: academyInstructors.clientId,
      clientName: clients.fullName,
      name: academyInstructors.name,
      email: academyInstructors.email,
      phone: academyInstructors.phone,
      title: academyInstructors.title,
      specialty: academyInstructors.specialty,
      bio: academyInstructors.bio,
      startDate: academyInstructors.startDate,
      status: academyInstructors.status,
    })
    .from(academyInstructors)
    .leftJoin(clients, eq(academyInstructors.clientId, clients.id))
    .where(eq(academyInstructors.clientId, clientId))
    .limit(1);
  return row ?? null;
}

export async function createAcademyInstructor(values: AcademyInstructorFormValues) {
  const db = getDb();
  // Defensive re-check: the UI already blocks this at link-time, but this
  // closes the same race window resolveClientId (appointments/actions.ts)
  // closes for client creation — never trust client state alone.
  if (values.clientId) {
    const existing = await findAcademyInstructorByClientId(values.clientId);
    if (existing) {
      throw new Error("This person is already an Academy Instructor.");
    }
  }
  await db.insert(academyInstructors).values({
    clientId: values.clientId || null,
    name: values.name || null,
    email: values.email || null,
    phone: values.phone || null,
    title: values.title || null,
    specialty: values.specialty || null,
    bio: values.bio || null,
    startDate: values.startDate || null,
    status: values.status,
  });
}

export async function updateAcademyInstructor(
  id: string,
  values: AcademyInstructorFormValues,
) {
  const db = getDb();
  if (values.clientId) {
    const existing = await findAcademyInstructorByClientId(values.clientId);
    if (existing && existing.id !== id) {
      throw new Error("This person is already an Academy Instructor.");
    }
  }
  await db
    .update(academyInstructors)
    .set({
      clientId: values.clientId || null,
      name: values.name || null,
      email: values.email || null,
      phone: values.phone || null,
      title: values.title || null,
      specialty: values.specialty || null,
      bio: values.bio || null,
      startDate: values.startDate || null,
      status: values.status,
      updatedAt: new Date(),
    })
    .where(eq(academyInstructors.id, id));
}

export async function updateAcademyInstructorStatus(
  id: string,
  status: AcademyInstructorFormValues["status"],
) {
  const db = getDb();
  await db
    .update(academyInstructors)
    .set({ status, updatedAt: new Date() })
    .where(eq(academyInstructors.id, id));
}

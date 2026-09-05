import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { professionalSystems } from "@/lib/db/schema";

export async function listProfessionalSystems() {
  return getDb()
    .select()
    .from(professionalSystems)
    .orderBy(asc(professionalSystems.sortOrder));
}

export async function listActiveProfessionalSystems() {
  return getDb()
    .select()
    .from(professionalSystems)
    .where(eq(professionalSystems.active, true))
    .orderBy(asc(professionalSystems.sortOrder));
}

export async function getProfessionalSystemById(id: string) {
  const [row] = await getDb()
    .select()
    .from(professionalSystems)
    .where(eq(professionalSystems.id, id))
    .limit(1);
  return row ?? null;
}

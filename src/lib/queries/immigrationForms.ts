import { asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { immigrationForms } from "@/lib/db/schema";

export async function listImmigrationForms() {
  return getDb()
    .select()
    .from(immigrationForms)
    .orderBy(asc(immigrationForms.category), asc(immigrationForms.formNumber));
}

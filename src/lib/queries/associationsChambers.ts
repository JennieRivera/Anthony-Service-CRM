import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { associationsChambers } from "@/lib/db/schema";

export async function listAssociationsChambers(state?: string) {
  return getDb()
    .select()
    .from(associationsChambers)
    .where(state ? eq(associationsChambers.state, state) : undefined)
    .orderBy(desc(associationsChambers.createdAt));
}

export async function getAssociationChamberById(id: string) {
  const [row] = await getDb()
    .select()
    .from(associationsChambers)
    .where(eq(associationsChambers.id, id))
    .limit(1);
  return row ?? null;
}

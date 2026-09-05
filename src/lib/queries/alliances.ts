import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { strategicAlliances, allianceStatusHistory } from "@/lib/db/schema";

export async function listAlliances() {
  return getDb()
    .select()
    .from(strategicAlliances)
    .orderBy(desc(strategicAlliances.createdAt));
}

export async function getAllianceById(id: string) {
  const db = getDb();

  const [alliance] = await db
    .select()
    .from(strategicAlliances)
    .where(eq(strategicAlliances.id, id))
    .limit(1);

  if (!alliance) return null;

  const statusHistory = await db
    .select()
    .from(allianceStatusHistory)
    .where(eq(allianceStatusHistory.allianceId, id))
    .orderBy(desc(allianceStatusHistory.changedAt));

  return { alliance, statusHistory };
}

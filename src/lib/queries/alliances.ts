import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  strategicAlliances,
  allianceStatusHistory,
  allianceDocuments,
  referrals,
  clients,
} from "@/lib/db/schema";

export async function listAlliances() {
  return getDb()
    .select()
    .from(strategicAlliances)
    .orderBy(desc(strategicAlliances.createdAt));
}

export async function listAlliancesForSelect() {
  return getDb()
    .select({ id: strategicAlliances.id, organizationName: strategicAlliances.organizationName })
    .from(strategicAlliances)
    .orderBy(strategicAlliances.organizationName);
}

export async function listAllianceDocuments() {
  return getDb().select().from(allianceDocuments).orderBy(desc(allianceDocuments.createdAt));
}

export async function getAllianceById(id: string) {
  const db = getDb();

  const [alliance] = await db
    .select()
    .from(strategicAlliances)
    .where(eq(strategicAlliances.id, id))
    .limit(1);

  if (!alliance) return null;

  const [statusHistory, linkedReferrals, documents] = await Promise.all([
    db
      .select()
      .from(allianceStatusHistory)
      .where(eq(allianceStatusHistory.allianceId, id))
      .orderBy(desc(allianceStatusHistory.changedAt)),
    db
      .select({
        id: referrals.id,
        referralSeq: referrals.referralSeq,
        clientId: clients.id,
        clientName: clients.fullName,
        commissionPercentage: referrals.commissionPercentage,
        commissionDue: referrals.commissionDue,
        status: referrals.status,
      })
      .from(referrals)
      .innerJoin(clients, eq(referrals.clientId, clients.id))
      .where(eq(referrals.allianceId, id))
      .orderBy(referrals.referralSeq),
    db
      .select()
      .from(allianceDocuments)
      .where(eq(allianceDocuments.allianceId, id))
      .orderBy(desc(allianceDocuments.createdAt)),
  ]);

  return { alliance, statusHistory, linkedReferrals, documents };
}

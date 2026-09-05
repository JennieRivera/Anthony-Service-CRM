import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { referrals, clients, cases } from "@/lib/db/schema";

export async function listCasesForSelect() {
  return getDb()
    .select({ id: cases.id, title: cases.title })
    .from(cases)
    .orderBy(desc(cases.createdAt));
}

export async function listReferralsWithClient() {
  return getDb()
    .select({
      id: referrals.id,
      referralSeq: referrals.referralSeq,
      referralDate: referrals.referralDate,
      status: referrals.status,
      commissionDue: referrals.commissionDue,
      commissionPaidDate: referrals.commissionPaidDate,
      clientId: clients.id,
      clientName: clients.fullName,
    })
    .from(referrals)
    .innerJoin(clients, eq(referrals.clientId, clients.id))
    .orderBy(desc(referrals.createdAt));
}

export async function getReferralById(id: string) {
  const db = getDb();

  const [row] = await db
    .select({
      referral: referrals,
      client: clients,
      caseTitle: cases.title,
    })
    .from(referrals)
    .innerJoin(clients, eq(referrals.clientId, clients.id))
    .leftJoin(cases, eq(referrals.caseId, cases.id))
    .where(eq(referrals.id, id))
    .limit(1);

  if (!row) return null;

  return {
    referral: row.referral,
    client: row.client,
    caseTitle: row.caseTitle,
  };
}

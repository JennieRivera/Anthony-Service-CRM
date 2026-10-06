import { aliasedTable, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  referrals,
  clients,
  cases,
  rriReferralDetails,
  referralStatusHistory,
  strategicAlliances,
} from "@/lib/db/schema";
import { getCompensationForReferral } from "@/lib/queries/referralCompensations";

export async function listCasesForSelect() {
  return getDb()
    .select({ id: cases.id, title: cases.title })
    .from(cases)
    .orderBy(desc(cases.createdAt));
}

export async function listReferralsForSelect() {
  return getDb()
    .select({ id: referrals.id, referralSeq: referrals.referralSeq })
    .from(referrals)
    .orderBy(desc(referrals.createdAt));
}

export async function listReferralsWithClient() {
  // Ally-network referrals (partner portal, option A) show "From → To".
  const sender = aliasedTable(strategicAlliances, "sender");
  const assignee = aliasedTable(strategicAlliances, "assignee");
  return getDb()
    .select({
      id: referrals.id,
      referralSeq: referrals.referralSeq,
      referralDate: referrals.referralDate,
      category: referrals.category,
      direction: referrals.direction,
      status: referrals.status,
      pipelineStatus: referrals.pipelineStatus,
      commissionDue: referrals.commissionDue,
      commissionPaidDate: referrals.commissionPaidDate,
      allianceId: referrals.allianceId,
      clientId: clients.id,
      clientName: clients.fullName,
      networkRouting: referrals.networkRouting,
      senderName: sender.organizationName,
      assigneeName: assignee.organizationName,
    })
    .from(referrals)
    .innerJoin(clients, eq(referrals.clientId, clients.id))
    .leftJoin(sender, eq(sender.id, referrals.allianceId))
    .leftJoin(assignee, eq(assignee.id, referrals.assignedAllianceId))
    .orderBy(desc(referrals.createdAt));
}

export async function getReferralById(id: string) {
  const db = getDb();

  const [row] = await db
    .select({
      referral: referrals,
      client: clients,
      caseTitle: cases.title,
      allianceName: strategicAlliances.organizationName,
    })
    .from(referrals)
    .innerJoin(clients, eq(referrals.clientId, clients.id))
    .leftJoin(cases, eq(referrals.caseId, cases.id))
    .leftJoin(strategicAlliances, eq(referrals.allianceId, strategicAlliances.id))
    .where(eq(referrals.id, id))
    .limit(1);

  if (!row) return null;

  // Referrals & Commissions Foundation — referrerClientId is a second,
  // separate link to `clients` on the same row (the REFERRER, never the
  // same join as `client` above which is always the REFERRED client) —
  // queried on its own since Drizzle can't alias the same table twice in
  // one declarative select without a second table reference.
  const referrerClient = row.referral.referrerClientId
    ? await db
        .select({ id: clients.id, fullName: clients.fullName })
        .from(clients)
        .where(eq(clients.id, row.referral.referrerClientId))
        .limit(1)
        .then((r) => r[0] ?? null)
    : null;

  const [rriDetails, statusHistory, compensation] = await Promise.all([
    db
      .select()
      .from(rriReferralDetails)
      .where(eq(rriReferralDetails.referralId, id))
      .limit(1),
    db
      .select()
      .from(referralStatusHistory)
      .where(eq(referralStatusHistory.referralId, id))
      .orderBy(desc(referralStatusHistory.changedAt)),
    getCompensationForReferral(id),
  ]);

  return {
    referral: row.referral,
    client: row.client,
    caseTitle: row.caseTitle,
    allianceName: row.allianceName,
    referrerClient,
    rriDetails: rriDetails[0] ?? null,
    statusHistory,
    compensation,
  };
}

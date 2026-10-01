import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  strategicAlliances,
  allianceStatusHistory,
  allianceDocuments,
  allianceContacts,
  referrals,
  clients,
  companies,
  conversationMessages,
  appointments,
} from "@/lib/db/schema";

export async function listAllianceContacts(allianceId: string) {
  return getDb()
    .select()
    .from(allianceContacts)
    .where(eq(allianceContacts.allianceId, allianceId))
    .orderBy(allianceContacts.createdAt);
}

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

  const [linkedClient, linkedCompany] = await Promise.all([
    alliance.contactClientId
      ? db
          .select({ id: clients.id, fullName: clients.fullName })
          .from(clients)
          .where(eq(clients.id, alliance.contactClientId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : null,
    alliance.companyId
      ? db
          .select({ id: companies.id, legalBusinessName: companies.legalBusinessName })
          .from(companies)
          .where(eq(companies.id, alliance.companyId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : null,
  ]);

  const [statusHistory, linkedReferrals, documents, contacts, communications, linkedAppointments] =
    await Promise.all([
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
      db
        .select()
        .from(allianceContacts)
        .where(eq(allianceContacts.allianceId, id))
        .orderBy(allianceContacts.createdAt),
      db
        .select({
          id: conversationMessages.id,
          communicationSeq: conversationMessages.communicationSeq,
          channel: conversationMessages.channel,
          direction: conversationMessages.direction,
          subject: conversationMessages.subject,
          summary: conversationMessages.summary,
          occurredAt: conversationMessages.occurredAt,
          status: conversationMessages.status,
        })
        .from(conversationMessages)
        .where(eq(conversationMessages.allianceId, id))
        .orderBy(desc(conversationMessages.occurredAt)),
      db
        .select({
          id: appointments.id,
          title: appointments.title,
          startAt: appointments.startAt,
          endAt: appointments.endAt,
          status: appointments.status,
          clientId: clients.id,
          clientName: clients.fullName,
        })
        .from(appointments)
        .innerJoin(clients, eq(appointments.clientId, clients.id))
        .where(eq(appointments.allianceId, id))
        .orderBy(desc(appointments.startAt)),
    ]);

  return {
    alliance,
    statusHistory,
    linkedReferrals,
    documents,
    linkedClient,
    linkedCompany,
    contacts,
    communications,
    linkedAppointments,
  };
}

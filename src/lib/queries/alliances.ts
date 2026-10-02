import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  strategicAlliances,
  allianceStatusHistory,
  allianceDocuments,
  allianceContacts,
  allianceNetworkRelationships,
  referrals,
  clients,
  companies,
  conversationMessages,
  appointments,
} from "@/lib/db/schema";
import { listAuditLogForEntity } from "@/lib/queries/auditLog";

// B2B Network Foundation — both directions of this alliance's network
// provenance: alliances THIS one introduced, and alliances that
// introduced THIS one. Deliberately two separate lists (not one merged
// "connections" list) so the UI can always show who introduced whom,
// never just an undirected link.
export async function listAllianceNetworkRelationships(allianceId: string) {
  const db = getDb();
  const [introduced, introducedBy] = await Promise.all([
    db
      .select({
        id: allianceNetworkRelationships.id,
        relationshipDate: allianceNetworkRelationships.relationshipDate,
        notes: allianceNetworkRelationships.notes,
        recordedByEmail: allianceNetworkRelationships.recordedByEmail,
        createdAt: allianceNetworkRelationships.createdAt,
        otherAllianceId: strategicAlliances.id,
        otherAllianceName: strategicAlliances.organizationName,
      })
      .from(allianceNetworkRelationships)
      .innerJoin(
        strategicAlliances,
        eq(allianceNetworkRelationships.introducedAllianceId, strategicAlliances.id),
      )
      .where(eq(allianceNetworkRelationships.referringAllianceId, allianceId))
      .orderBy(desc(allianceNetworkRelationships.createdAt)),
    db
      .select({
        id: allianceNetworkRelationships.id,
        relationshipDate: allianceNetworkRelationships.relationshipDate,
        notes: allianceNetworkRelationships.notes,
        recordedByEmail: allianceNetworkRelationships.recordedByEmail,
        createdAt: allianceNetworkRelationships.createdAt,
        otherAllianceId: strategicAlliances.id,
        otherAllianceName: strategicAlliances.organizationName,
      })
      .from(allianceNetworkRelationships)
      .innerJoin(
        strategicAlliances,
        eq(allianceNetworkRelationships.referringAllianceId, strategicAlliances.id),
      )
      .where(eq(allianceNetworkRelationships.introducedAllianceId, allianceId))
      .orderBy(desc(allianceNetworkRelationships.createdAt)),
  ]);
  return { introduced, introducedBy };
}

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

  const [network, activity] = await Promise.all([
    listAllianceNetworkRelationships(id),
    listAuditLogForEntity("alliance", id),
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
    network,
    activity,
  };
}

// Pre-check used by the Server Action before inserting, same pattern as
// createAuthorizedUser's email check (src/lib/queries/authorizedUsers.ts)
// — a SELECT-then-INSERT is more portable and gives a reliable friendly
// error than catching a driver-specific unique-constraint error shape.
// The unique index on the table (schema.ts) remains the real guarantee
// against a race between two concurrent requests; this is the normal-path
// check.
export async function allianceNetworkRelationshipExists(
  referringAllianceId: string,
  introducedAllianceId: string,
) {
  const [existing] = await getDb()
    .select({ id: allianceNetworkRelationships.id })
    .from(allianceNetworkRelationships)
    .where(
      and(
        eq(allianceNetworkRelationships.referringAllianceId, referringAllianceId),
        eq(allianceNetworkRelationships.introducedAllianceId, introducedAllianceId),
      ),
    )
    .limit(1);
  return Boolean(existing);
}

// B2B Network Foundation — creates one directional provenance row
// (referringAllianceId introduced introducedAllianceId). Self-link and
// duplicate-pair rejection both happen before this is called in the
// Server Action (see allianceNetworkRelationshipExists above and
// allianceNetworkRelationships in schema.ts for the unique index that
// still guards against a race between two concurrent requests).
export async function createAllianceNetworkRelationship(params: {
  referringAllianceId: string;
  introducedAllianceId: string;
  relationshipDate: string | null;
  notes: string | null;
  recordedByEmail: string | null;
}) {
  const [row] = await getDb()
    .insert(allianceNetworkRelationships)
    .values(params)
    .returning();
  return row;
}

export async function deleteAllianceNetworkRelationship(id: string) {
  const [row] = await getDb()
    .delete(allianceNetworkRelationships)
    .where(eq(allianceNetworkRelationships.id, id))
    .returning();
  return row ?? null;
}

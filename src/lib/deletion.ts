import { and, count, eq, inArray, isNotNull } from "drizzle-orm";
import {
  allianceDocuments,
  allianceMemberships,
  appointments,
  cases,
  clients,
  documents,
  invoices,
  partnerAccessLinks,
  partnerContactDocuments,
  partnerPhotos,
  partnerProfiles,
  partnerSessions,
  referralCompensations,
  referrals,
  strategicAlliances,
  tasks,
} from "@/lib/db/schema";
import type { PortalDb } from "@/lib/portal/db";
import { isForeignKeyBlock } from "@/lib/db/errors";

// Deleting a client or an alliance: what goes, what stays, and what blocks
// it. The database is passed in (production: getDb(); tests: PGlite).
// Financial history is never deleted: a client with invoices, or with a
// referral that has a compensation record, and an alliance with an
// invoiced membership, are blocked with a reason instead.

const n = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;

// ── client ───────────────────────────────────────────────────────────

export async function getClientDeletionImpact(db: PortalDb, clientId: string) {
  const clientReferrals = db.select({ id: referrals.id }).from(referrals).where(eq(referrals.clientId, clientId));
  const [casesN, apptsN, docsN, referralsN, openTasksN, invoicesN, compN] = await Promise.all([
    n(db.select({ n: count() }).from(cases).where(eq(cases.clientId, clientId))),
    n(db.select({ n: count() }).from(appointments).where(eq(appointments.clientId, clientId))),
    n(db.select({ n: count() }).from(documents).where(eq(documents.clientId, clientId))),
    n(db.select({ n: count() }).from(referrals).where(eq(referrals.clientId, clientId))),
    n(db.select({ n: count() }).from(tasks).where(and(eq(tasks.clientId, clientId), eq(tasks.status, "open")))),
    n(db.select({ n: count() }).from(invoices).where(eq(invoices.clientId, clientId))),
    n(db.select({ n: count() }).from(referralCompensations).where(inArray(referralCompensations.referralId, clientReferrals))),
  ]);
  return {
    cases: casesN,
    appointments: apptsN,
    documents: docsN,
    referrals: referralsN,
    openTasks: openTasksN,
    blockedBy: invoicesN > 0 ? ("billing" as const) : compN > 0 ? ("compensation" as const) : null,
  };
}

export type ClientDeleteResult =
  | { ok: true; fullName: string; referrals: number; documentUrls: string[] }
  | { ok: false; reason: "not_found" | "billing" | "compensation" | "linked_records" };

// Deletes the client's referrals (a referral can't exist without its
// client), then the client — its cases, appointments, documents, tasks,
// conversations and portal access go with it (cascade). Returns the blob
// URLs of its documents so the caller can remove the files.
export async function deleteClientRecord(db: PortalDb, clientId: string): Promise<ClientDeleteResult> {
  const [client] = await db.select({ fullName: clients.fullName }).from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) return { ok: false, reason: "not_found" };
  const impact = await getClientDeletionImpact(db, clientId);
  if (impact.blockedBy) return { ok: false, reason: impact.blockedBy };

  const docs = await db.select({ url: documents.blobUrl }).from(documents).where(eq(documents.clientId, clientId));
  try {
    await db.delete(referrals).where(eq(referrals.clientId, clientId));
    await db.delete(clients).where(eq(clients.id, clientId));
  } catch (error) {
    if (isForeignKeyBlock(error)) return { ok: false, reason: "linked_records" };
    throw error;
  }
  return { ok: true, fullName: client.fullName, referrals: impact.referrals, documentUrls: docs.map((d) => d.url) };
}

// ── alliance ─────────────────────────────────────────────────────────

export async function getAllianceDeletionImpact(db: PortalDb, allianceId: string) {
  const [docsN, photosN, accessN, referralsN, addedN, invoicedN] = await Promise.all([
    n(db.select({ n: count() }).from(allianceDocuments).where(eq(allianceDocuments.allianceId, allianceId))),
    n(db.select({ n: count() }).from(partnerPhotos).where(eq(partnerPhotos.allianceId, allianceId))),
    n(db.select({ n: count() }).from(partnerSessions).where(eq(partnerSessions.allianceId, allianceId))),
    n(db.select({ n: count() }).from(referrals).where(eq(referrals.allianceId, allianceId))),
    n(db.select({ n: count() }).from(clients).where(eq(clients.addedByAllianceId, allianceId))),
    n(
      db
        .select({ n: count() })
        .from(allianceMemberships)
        .where(and(eq(allianceMemberships.allianceId, allianceId), isNotNull(allianceMemberships.invoiceId))),
    ),
  ]);
  return {
    documents: docsN,
    photos: photosN,
    sessions: accessN,
    referrals: referralsN,
    addedClients: addedN,
    blockedBy: invoicedN > 0 ? ("membership_billing" as const) : null,
  };
}

export type AllianceDeleteResult =
  | { ok: true; name: string; blobUrls: string[] }
  | { ok: false; reason: "not_found" | "membership_billing" | "linked_records" };

// Deletes the alliance and, with it (cascade): portal access, sessions,
// partner profile and photos, alliance documents, contacts, network
// links, memberships, status history, its tasks, and its own network list
// (with the files it uploaded for its contacts). Stays: clients and
// alliances it added ("Added by…" is cleared), referrals (alliance cleared), and
// appointments/communications (alliance cleared). Returns the blob URLs
// (documents, photos, logo) for the caller to remove.
export async function deleteAllianceRecord(db: PortalDb, allianceId: string): Promise<AllianceDeleteResult> {
  const [alliance] = await db
    .select({ name: strategicAlliances.organizationName })
    .from(strategicAlliances)
    .where(eq(strategicAlliances.id, allianceId))
    .limit(1);
  if (!alliance) return { ok: false, reason: "not_found" };
  const impact = await getAllianceDeletionImpact(db, allianceId);
  if (impact.blockedBy) return { ok: false, reason: impact.blockedBy };

  const [docs, photos, profile, contactDocs] = await Promise.all([
    db.select({ url: allianceDocuments.blobUrl }).from(allianceDocuments).where(eq(allianceDocuments.allianceId, allianceId)),
    db.select({ url: partnerPhotos.blobUrl }).from(partnerPhotos).where(eq(partnerPhotos.allianceId, allianceId)),
    db.select({ url: partnerProfiles.logoBlobUrl }).from(partnerProfiles).where(eq(partnerProfiles.allianceId, allianceId)),
    db.select({ url: partnerContactDocuments.blobUrl }).from(partnerContactDocuments).where(eq(partnerContactDocuments.ownerAllianceId, allianceId)),
  ]);
  try {
    // Explicit for clarity (these also cascade).
    await db.delete(partnerSessions).where(eq(partnerSessions.allianceId, allianceId));
    await db.delete(partnerAccessLinks).where(eq(partnerAccessLinks.allianceId, allianceId));
    await db.delete(strategicAlliances).where(eq(strategicAlliances.id, allianceId));
  } catch (error) {
    if (isForeignKeyBlock(error)) return { ok: false, reason: "linked_records" };
    throw error;
  }
  return {
    ok: true,
    name: alliance.name,
    blobUrls: [
      ...docs.map((d) => d.url),
      ...photos.map((p) => p.url),
      ...profile.flatMap((p) => (p.url ? [p.url] : [])),
      ...contactDocs.map((d) => d.url),
    ],
  };
}

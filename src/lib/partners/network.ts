import { aliasedTable, and, count, desc, eq, gt, ilike, inArray, ne, or } from "drizzle-orm";
import {
  allianceNetworkRelationships,
  allianceStatusHistory,
  clients,
  partnerContactDocuments,
  partnerContacts,
  referrals,
  strategicAlliances,
  tasks,
} from "@/lib/db/schema";
import { businessDateString } from "@/lib/dates";
import { formatUsPhone, usPhoneDigits } from "@/lib/validation/onlineBooking";
import type { PortalDb } from "@/lib/portal/db";
import { PARTNER_MAX_REFERRALS_PER_DAY } from "./config";
import {
  PartnerLimitError,
  PartnerNotFoundError,
  PartnerValidationError,
  createPartnerReferral,
  isUuid,
  recordPartnerConsent,
} from "./queries";

// "My allies and contacts" (partner portal, Phase B). The rules:
//   1. Every ally has ITS OWN network: the owner (allianceId from the
//      session) is always in the WHERE clause, so one ally never sees
//      another ally's contacts, or AMS's.
//   2. A person who needs a service becomes a Lead in Clients plus a
//      referral to AMS (createPartnerReferral); a business becomes a
//      Prospect alliance "Added by [ally]" with a network link.
//   3. The ally only sees what it typed (partner_contacts), never the CRM
//      records those became. A possible duplicate is flagged to staff only.

const DAY_MS = 24 * 60 * 60 * 1000;
const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/g, "").trim().slice(0, max) : "";

// An alliance added by an ally can get portal access only once staff has
// made it an active ally.
export const ACTIVE_ALLY_STATUSES = ["active_partner", "member"] as const;

async function ownerName(db: PortalDb, allianceId: string) {
  const [a] = await db
    .select({ name: strategicAlliances.organizationName })
    .from(strategicAlliances)
    .where(eq(strategicAlliances.id, allianceId))
    .limit(1);
  return a?.name ?? "";
}

// ── add a contact ────────────────────────────────────────────────────

export async function createPartnerContact(
  db: PortalDb,
  params: {
    allianceId: string;
    input: unknown;
    permissionText: string;
    ipAddress: string | null;
    userAgent: string | null;
    now?: Date;
  },
): Promise<{ id: string; kind: "person" | "business" }> {
  const input = (params.input && typeof params.input === "object" ? params.input : {}) as Record<string, unknown>;
  if (input.kind === "person") {
    const r = await createPartnerReferral(db, params);
    return { id: r.contactId, kind: "person" };
  }
  if (input.kind !== "business") throw new PartnerValidationError("kind");

  const now = params.now ?? new Date();
  if (input.permission !== true) throw new PartnerValidationError("permission");
  const businessName = clean(input.businessName, 200);
  if (businessName.length < 2) throw new PartnerValidationError("businessName");
  const name = clean(input.name, 200);
  const rawPhone = clean(input.phone, 30);
  const digits = rawPhone ? usPhoneDigits(rawPhone) : null;
  if (rawPhone && !digits) throw new PartnerValidationError("phone");
  const email = clean(input.email, 200).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new PartnerValidationError("email");
  if (!digits && !email) throw new PartnerValidationError("contact");
  const services = clean(input.services, 1000);
  const note = clean(input.note, 1000);
  const phone = digits ? formatUsPhone(digits) : null;

  const [recent] = await db
    .select({ n: count() })
    .from(partnerContacts)
    .where(and(eq(partnerContacts.ownerAllianceId, params.allianceId), eq(partnerContacts.kind, "business"), gt(partnerContacts.createdAt, new Date(now.getTime() - DAY_MS))));
  if ((recent?.n ?? 0) >= PARTNER_MAX_REFERRALS_PER_DAY) throw new PartnerLimitError("Too many contacts today");

  const owner = await ownerName(db, params.allianceId);
  // Possible duplicate (staff-only hint): same business name, phone or email.
  const dupConditions = [
    ilike(strategicAlliances.organizationName, businessName),
    ...(phone ? [eq(strategicAlliances.phone, phone)] : []),
    ...(email ? [eq(strategicAlliances.email, email)] : []),
  ];
  const [dup] = await db
    .select({ name: strategicAlliances.organizationName })
    .from(strategicAlliances)
    .where(or(...dupConditions))
    .limit(1);

  const [alliance] = await db
    .insert(strategicAlliances)
    .values({
      organizationName: businessName,
      contactPerson: name || null,
      phone,
      email: email || null,
      status: "prospect",
      servicesConnected: services || null,
      dateIntroduced: businessDateString(now),
      notes: `Agregado por ${owner} (Diamante Conecta 360).${note ? ` Nota del aliado: ${note}` : ""}`,
      addedByAllianceId: params.allianceId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: strategicAlliances.id });
  await db.insert(allianceStatusHistory).values({
    allianceId: alliance.id,
    previousStatus: null,
    newStatus: "prospect",
    changedByEmail: `partner-portal:${params.allianceId}`,
  });
  await db.insert(allianceNetworkRelationships).values({
    referringAllianceId: params.allianceId,
    introducedAllianceId: alliance.id,
    relationshipDate: businessDateString(now),
    notes: "Added in the partner portal",
    recordedByEmail: `partner-portal:${params.allianceId}`,
  });
  const [contact] = await db
    .insert(partnerContacts)
    .values({
      ownerAllianceId: params.allianceId,
      kind: "business",
      name: name || businessName,
      businessName,
      phone,
      email: email || null,
      services: services || null,
      note: note || null,
      introducedAllianceId: alliance.id,
      createdAt: now,
    })
    .returning({ id: partnerContacts.id });
  await recordPartnerConsent(db, {
    allianceId: params.allianceId,
    type: "contact_permission",
    textShown: params.permissionText,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    now,
  });
  await db.insert(tasks).values({
    allianceId: alliance.id,
    type: "partner_network_review",
    title: `New ally added by ${owner}: ${businessName}${dup ? ` — possible duplicate of ${dup.name}` : ""}`,
    createdAt: now,
  });
  return { id: contact.id, kind: "business" };
}

// ── the ally's own list ──────────────────────────────────────────────

export async function listPartnerContacts(db: PortalDb, allianceId: string) {
  const rows = await db
    .select({
      id: partnerContacts.id,
      createdAt: partnerContacts.createdAt,
      kind: partnerContacts.kind,
      name: partnerContacts.name,
      businessName: partnerContacts.businessName,
      phone: partnerContacts.phone,
      email: partnerContacts.email,
      services: partnerContacts.services,
      note: partnerContacts.note,
    })
    .from(partnerContacts)
    .where(eq(partnerContacts.ownerAllianceId, allianceId))
    .orderBy(desc(partnerContacts.createdAt));
  const docs = rows.length
    ? await db
        .select({ id: partnerContactDocuments.id, contactId: partnerContactDocuments.contactId, fileName: partnerContactDocuments.fileName })
        .from(partnerContactDocuments)
        .where(
          and(
            eq(partnerContactDocuments.ownerAllianceId, allianceId),
            inArray(
              partnerContactDocuments.contactId,
              rows.map((r) => r.id),
            ),
          ),
        )
        .orderBy(partnerContactDocuments.createdAt)
    : [];
  return rows.map((r) => ({ ...r, documents: docs.filter((d) => d.contactId === r.id).map(({ id, fileName }) => ({ id, fileName })) }));
}

export async function isOwnPartnerContact(db: PortalDb, allianceId: string, contactId: unknown) {
  if (!isUuid(contactId)) return false;
  const [row] = await db
    .select({ id: partnerContacts.id })
    .from(partnerContacts)
    .where(and(eq(partnerContacts.id, contactId), eq(partnerContacts.ownerAllianceId, allianceId)))
    .limit(1);
  return Boolean(row);
}

export async function recordPartnerContactDocument(
  db: PortalDb,
  params: { allianceId: string; contactId: unknown; fileName: string; blobUrl: string; sensitiveDataReason: string | null; now?: Date },
) {
  const now = params.now ?? new Date();
  if (!(await isOwnPartnerContact(db, params.allianceId, params.contactId))) throw new PartnerNotFoundError("Contact not found");
  const contactId = params.contactId as string;
  const [contact] = await db
    .select({ name: partnerContacts.name, businessName: partnerContacts.businessName })
    .from(partnerContacts)
    .where(eq(partnerContacts.id, contactId))
    .limit(1);
  const [doc] = await db
    .insert(partnerContactDocuments)
    .values({
      contactId,
      ownerAllianceId: params.allianceId,
      fileName: params.fileName,
      blobUrl: params.blobUrl,
      sensitiveDataReason: params.sensitiveDataReason,
      createdAt: now,
    })
    .returning({ id: partnerContactDocuments.id });
  await db.insert(tasks).values({
    allianceId: params.allianceId,
    type: "partner_network_review",
    title: `Review ally-network document: "${params.fileName}" — ${contact?.businessName ?? contact?.name ?? "—"}${params.sensitiveDataReason ? " — may contain sensitive data" : ""}`.slice(0, 2000),
    createdAt: now,
  });
  return doc.id;
}

// The file of one of the ally's OWN contact documents, or null.
export async function getPartnerContactDocumentUrl(db: PortalDb, allianceId: string, documentId: unknown) {
  if (!isUuid(documentId)) return null;
  const [row] = await db
    .select({ url: partnerContactDocuments.blobUrl, fileName: partnerContactDocuments.fileName })
    .from(partnerContactDocuments)
    .where(and(eq(partnerContactDocuments.id, documentId), eq(partnerContactDocuments.ownerAllianceId, allianceId)))
    .limit(1);
  return row ?? null;
}

// ── staff (CRM) ──────────────────────────────────────────────────────

// "Ally network" on an alliance record: everything that ally added.
export async function getAllianceNetworkForStaff(db: PortalDb, allianceId: string) {
  const introduced = aliasedTable(strategicAlliances, "introduced");
  const rows = await db
    .select({
      id: partnerContacts.id,
      createdAt: partnerContacts.createdAt,
      kind: partnerContacts.kind,
      name: partnerContacts.name,
      businessName: partnerContacts.businessName,
      phone: partnerContacts.phone,
      email: partnerContacts.email,
      services: partnerContacts.services,
      note: partnerContacts.note,
      clientId: partnerContacts.clientId,
      clientName: clients.fullName,
      allianceId: partnerContacts.introducedAllianceId,
      allianceName: introduced.organizationName,
      allianceStatus: introduced.status,
    })
    .from(partnerContacts)
    .leftJoin(clients, eq(clients.id, partnerContacts.clientId))
    .leftJoin(introduced, eq(introduced.id, partnerContacts.introducedAllianceId))
    .where(eq(partnerContacts.ownerAllianceId, allianceId))
    .orderBy(desc(partnerContacts.createdAt));
  const docs = rows.length
    ? await db
        .select({
          id: partnerContactDocuments.id,
          contactId: partnerContactDocuments.contactId,
          fileName: partnerContactDocuments.fileName,
          sensitive: partnerContactDocuments.sensitiveDataReason,
        })
        .from(partnerContactDocuments)
        .where(eq(partnerContactDocuments.ownerAllianceId, allianceId))
        .orderBy(partnerContactDocuments.createdAt)
    : [];
  return rows.map((r) => ({ ...r, documents: docs.filter((d) => d.contactId === r.id) }));
}

export async function getPartnerContactDocumentForStaff(db: PortalDb, allianceId: string, documentId: unknown) {
  return getPartnerContactDocumentUrl(db, allianceId, documentId);
}

// "Convert" an alliance an ally added into an active AMS ally. Only then
// can it be given its own portal access.
export async function convertAllianceToActive(db: PortalDb, params: { allianceId: string; staffEmail: string | null; now?: Date }) {
  const now = params.now ?? new Date();
  const [a] = await db
    .select({ status: strategicAlliances.status })
    .from(strategicAlliances)
    .where(eq(strategicAlliances.id, params.allianceId))
    .limit(1);
  if (!a) throw new PartnerNotFoundError("Alliance not found");
  if ((ACTIVE_ALLY_STATUSES as readonly string[]).includes(a.status)) return false;
  await db.update(strategicAlliances).set({ status: "active_partner", updatedAt: now }).where(eq(strategicAlliances.id, params.allianceId));
  await db.insert(allianceStatusHistory).values({
    allianceId: params.allianceId,
    previousStatus: a.status,
    newStatus: "active_partner",
    changedByEmail: params.staffEmail,
  });
  return true;
}

// ── option A: staff assigns a network referral to an ally ────────────

export class NetworkAssignError extends Error {}

export async function assignNetworkReferral(
  db: PortalDb,
  params: {
    referralId: string;
    assignedAllianceId: string;
    assigneeNote: string;
    showAssigneeToSender: boolean;
    now?: Date;
  },
) {
  const now = params.now ?? new Date();
  if (!isUuid(params.referralId) || !isUuid(params.assignedAllianceId)) throw new NetworkAssignError("invalid");
  const [r] = await db
    .select({ id: referrals.id, allianceId: referrals.allianceId, networkRouting: referrals.networkRouting })
    .from(referrals)
    .where(eq(referrals.id, params.referralId))
    .limit(1);
  if (!r || !r.networkRouting) throw new NetworkAssignError("not_network");
  if (r.allianceId === params.assignedAllianceId) throw new NetworkAssignError("same_ally");
  const [target] = await db
    .select({ id: strategicAlliances.id })
    .from(strategicAlliances)
    .where(eq(strategicAlliances.id, params.assignedAllianceId))
    .limit(1);
  if (!target) throw new NetworkAssignError("invalid");

  await db
    .update(referrals)
    .set({
      assignedAllianceId: params.assignedAllianceId,
      assignedAt: now,
      assigneeNote: clean(params.assigneeNote, 1000) || null,
      showAssigneeToSender: params.showAssigneeToSender,
      pipelineStatus: "sent_to_partner",
      status: "in_progress",
      receivingParty: await ownerName(db, params.assignedAllianceId),
      updatedAt: now,
    })
    .where(eq(referrals.id, params.referralId));
  // The "assign" task is done.
  await db
    .update(tasks)
    .set({ status: "done", completedAt: now })
    .where(and(eq(tasks.referralId, params.referralId), eq(tasks.type, "partner_referral_assign"), ne(tasks.status, "done")));
}

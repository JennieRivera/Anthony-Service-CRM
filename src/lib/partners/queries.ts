import { aliasedTable, and, count, desc, eq, gt, inArray, isNotNull, or, sql } from "drizzle-orm";
import {
  allianceDocuments,
  clientCommunicationPreferences,
  clients,
  marketingAssetPartnerShares,
  marketingContentAssets,
  partnerConsentEvents,
  partnerContactDocuments,
  partnerContacts,
  partnerPhotos,
  partnerProfiles,
  referrals,
  strategicAlliances,
  tasks,
} from "@/lib/db/schema";
import { businessDateString } from "@/lib/dates";
import { formatUsPhone, usPhoneDigits } from "@/lib/validation/onlineBooking";
import { activeServiceTypeValues, type ServiceTypeValue } from "@/lib/validation/client";
import type { PortalDb } from "@/lib/portal/db";
import {
  PARTNER_MAX_PHOTOS,
  PARTNER_MAX_PROFILE_CHANGES_PER_DAY,
  PARTNER_MAX_REFERRALS_PER_DAY,
  PARTNER_MAX_UPLOADS_PER_DAY,
} from "./config";

// Partner portal data (Phase A). The rules, enforced here and tested in
// isolation.test.ts:
//   1. allianceId always comes from the resolved partner session and is
//      ALWAYS part of the WHERE clause — an alliance only ever reaches its
//      own rows.
//   2. Only the columns listed here are returned. An alliance never sees a
//      client record, case, document, or another alliance. On a referral
//      sent TO it, it sees the client's name and phone ONLY if the client
//      allowed sharing with partners (Communication Preferences →
//      partnerReferralConsent), plus the staff-written partner note and
//      service. On a referral it SENT, it sees what it typed.
//   3. Everything an alliance adds lands in the CRM and creates a task.
// No Next.js imports — runs on PGlite in the tests.

const DAY_MS = 24 * 60 * 60 * 1000;

export class PartnerNotFoundError extends Error {}
export class PartnerLimitError extends Error {}
export class PartnerValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/g, "").trim().slice(0, max) : "";

async function allianceName(db: PortalDb, allianceId: string) {
  const [a] = await db
    .select({ name: strategicAlliances.organizationName })
    .from(strategicAlliances)
    .where(eq(strategicAlliances.id, allianceId))
    .limit(1);
  return a?.name ?? "";
}

async function partnerTasksSince(db: PortalDb, allianceId: string, type: (typeof tasks.type.enumValues)[number], since: Date) {
  const [row] = await db
    .select({ n: count() })
    .from(tasks)
    .where(and(eq(tasks.allianceId, allianceId), eq(tasks.type, type), gt(tasks.createdAt, since)));
  return row?.n ?? 0;
}

// ── who / consent ────────────────────────────────────────────────────

export async function getPartnerAlliance(db: PortalDb, allianceId: string) {
  const [a] = await db
    .select({
      organizationName: strategicAlliances.organizationName,
      organizationType: strategicAlliances.organizationType,
      contactPerson: strategicAlliances.contactPerson,
      phone: strategicAlliances.phone,
      email: strategicAlliances.email,
      website: strategicAlliances.website,
      city: strategicAlliances.city,
      state: strategicAlliances.state,
    })
    .from(strategicAlliances)
    .where(eq(strategicAlliances.id, allianceId))
    .limit(1);
  return a ?? null;
}

export type PartnerConsentType = (typeof partnerConsentEvents.consentType.enumValues)[number];

export async function hasPartnerConsent(db: PortalDb, allianceId: string, type: PartnerConsentType) {
  const [latest] = await db
    .select({ granted: partnerConsentEvents.granted })
    .from(partnerConsentEvents)
    .where(and(eq(partnerConsentEvents.allianceId, allianceId), eq(partnerConsentEvents.consentType, type)))
    .orderBy(desc(partnerConsentEvents.createdAt))
    .limit(1);
  return latest?.granted === true;
}

export async function recordPartnerConsent(
  db: PortalDb,
  params: {
    allianceId: string;
    type: PartnerConsentType;
    textShown: string;
    ipAddress: string | null;
    userAgent: string | null;
    referralId?: string | null;
    // false = the ally withdrew it (e.g. unticked "show me in the directory").
    granted?: boolean;
    now?: Date;
  },
) {
  await db.insert(partnerConsentEvents).values({
    allianceId: params.allianceId,
    allianceNameSnapshot: await allianceName(db, params.allianceId),
    consentType: params.type,
    granted: params.granted ?? true,
    textShown: params.textShown,
    referralId: params.referralId ?? null,
    ipAddress: params.ipAddress?.slice(0, 64) ?? null,
    userAgent: params.userAgent?.slice(0, 400) ?? null,
    ...(params.now ? { createdAt: params.now } : {}),
  });
}

// ── My profile ───────────────────────────────────────────────────────

export async function getPartnerProfile(db: PortalDb, allianceId: string) {
  const alliance = await getPartnerAlliance(db, allianceId);
  if (!alliance) return null;
  const [profile] = await db.select().from(partnerProfiles).where(eq(partnerProfiles.allianceId, allianceId)).limit(1);
  const photos = await db
    .select({ id: partnerPhotos.id, fileName: partnerPhotos.fileName })
    .from(partnerPhotos)
    .where(eq(partnerPhotos.allianceId, allianceId))
    .orderBy(partnerPhotos.createdAt);
  return {
    alliance,
    description: profile?.description ?? "",
    servicesOffered: profile?.servicesOffered ?? "",
    serviceArea: profile?.serviceArea ?? "",
    socialLinks: profile?.socialLinks ?? "",
    hasLogo: Boolean(profile?.logoBlobUrl),
    licenseNumber: profile?.licenseNumber ?? "",
    licenseExpiration: profile?.licenseExpiration ?? "",
    insuranceProvider: profile?.insuranceProvider ?? "",
    insuranceExpiration: profile?.insuranceExpiration ?? "",
    photos,
  };
}

export const PARTNER_PROFILE_FIELDS = {
  contactPerson: 120,
  phone: 30,
  email: 200,
  website: 300,
  city: 100,
  state: 2,
  description: 2000,
  servicesOffered: 1000,
  serviceArea: 500,
  socialLinks: 1000,
  licenseNumber: 60,
  licenseExpiration: 10,
  insuranceProvider: 120,
  insuranceExpiration: 10,
} as const;
type ProfileField = keyof typeof PARTNER_PROFILE_FIELDS;

// Saves "My profile". Changes apply right away and create ONE task for
// staff listing every field before → after. Returns the changed fields.
export async function savePartnerProfile(
  db: PortalDb,
  params: { allianceId: string; values: unknown; now?: Date },
): Promise<{ changed: ProfileField[] }> {
  const now = params.now ?? new Date();
  if (!params.values || typeof params.values !== "object") throw new PartnerValidationError("invalid");
  const input = params.values as Record<string, unknown>;
  const next: Partial<Record<ProfileField, string>> = {};
  for (const [field, max] of Object.entries(PARTNER_PROFILE_FIELDS) as [ProfileField, number][]) {
    if (input[field] === undefined) continue;
    next[field] = clean(input[field], max);
  }
  if (next.phone) {
    const digits = usPhoneDigits(next.phone);
    if (!digits) throw new PartnerValidationError("phone");
    next.phone = formatUsPhone(digits);
  }
  if (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) throw new PartnerValidationError("email");
  if (next.state) next.state = next.state.toUpperCase();
  for (const d of ["licenseExpiration", "insuranceExpiration"] as const) {
    if (next[d] && !/^\d{4}-\d{2}-\d{2}$/.test(next[d]!)) throw new PartnerValidationError("date");
  }
  if (next.website && !/^https?:\/\//i.test(next.website)) next.website = `https://${next.website}`;

  const current = await getPartnerProfile(db, params.allianceId);
  if (!current) throw new PartnerNotFoundError("Alliance not found");
  const before: Record<ProfileField, string> = {
    contactPerson: current.alliance.contactPerson ?? "",
    phone: current.alliance.phone ?? "",
    email: current.alliance.email ?? "",
    website: current.alliance.website ?? "",
    city: current.alliance.city ?? "",
    state: current.alliance.state ?? "",
    description: current.description,
    servicesOffered: current.servicesOffered,
    serviceArea: current.serviceArea,
    socialLinks: current.socialLinks,
    licenseNumber: current.licenseNumber,
    licenseExpiration: current.licenseExpiration,
    insuranceProvider: current.insuranceProvider,
    insuranceExpiration: current.insuranceExpiration,
  };
  const changed = (Object.keys(next) as ProfileField[]).filter((f) => next[f] !== before[f]);
  if (changed.length === 0) return { changed };

  if ((await partnerTasksSince(db, params.allianceId, "partner_profile_review", new Date(now.getTime() - DAY_MS))) >= PARTNER_MAX_PROFILE_CHANGES_PER_DAY) {
    throw new PartnerLimitError("Too many profile changes today");
  }

  const v = (f: ProfileField) => (f in next ? next[f] || null : undefined);
  const allianceSet = Object.fromEntries(
    (["contactPerson", "phone", "email", "website", "city", "state"] as const)
      .filter((f) => f in next)
      .map((f) => [f, v(f)]),
  );
  if (Object.keys(allianceSet).length > 0) {
    await db.update(strategicAlliances).set({ ...allianceSet, updatedAt: now }).where(eq(strategicAlliances.id, params.allianceId));
  }
  const profileSet = Object.fromEntries(
    (["description", "servicesOffered", "serviceArea", "socialLinks", "licenseNumber", "licenseExpiration", "insuranceProvider", "insuranceExpiration"] as const)
      .filter((f) => f in next)
      .map((f) => [f, v(f)]),
  );
  if (Object.keys(profileSet).length > 0) {
    await db
      .insert(partnerProfiles)
      .values({ allianceId: params.allianceId, ...profileSet, updatedAt: now })
      .onConflictDoUpdate({ target: partnerProfiles.allianceId, set: { ...profileSet, updatedAt: now } });
  }

  const show = (s: string) => (s ? (s.length > 80 ? `${s.slice(0, 79)}…` : s) : "(empty)");
  await db.insert(tasks).values({
    allianceId: params.allianceId,
    type: "partner_profile_review",
    title: `Review partner profile change: ${changed.map((f) => `${f}: ${show(before[f])} → ${show(next[f] ?? "")}`).join("; ")}`.slice(0, 2000),
    createdAt: now,
  });
  return { changed };
}

// ── logo & photo gallery ─────────────────────────────────────────────

export async function setPartnerLogo(db: PortalDb, allianceId: string, blobUrl: string, now = new Date()) {
  await db
    .insert(partnerProfiles)
    .values({ allianceId, logoBlobUrl: blobUrl, updatedAt: now })
    .onConflictDoUpdate({ target: partnerProfiles.allianceId, set: { logoBlobUrl: blobUrl, updatedAt: now } });
}

export async function getPartnerLogoUrl(db: PortalDb, allianceId: string) {
  const [p] = await db
    .select({ url: partnerProfiles.logoBlobUrl })
    .from(partnerProfiles)
    .where(eq(partnerProfiles.allianceId, allianceId))
    .limit(1);
  return p?.url ?? null;
}

export async function countPartnerPhotos(db: PortalDb, allianceId: string) {
  const [row] = await db.select({ n: count() }).from(partnerPhotos).where(eq(partnerPhotos.allianceId, allianceId));
  return row?.n ?? 0;
}

export async function addPartnerPhoto(db: PortalDb, params: { allianceId: string; blobUrl: string; fileName: string }) {
  if ((await countPartnerPhotos(db, params.allianceId)) >= PARTNER_MAX_PHOTOS) throw new PartnerLimitError("Photo limit");
  const [row] = await db.insert(partnerPhotos).values(params).returning({ id: partnerPhotos.id });
  return row.id;
}

export async function getPartnerPhotoUrl(db: PortalDb, allianceId: string, photoId: unknown) {
  if (!isUuid(photoId)) return null;
  const [p] = await db
    .select({ url: partnerPhotos.blobUrl })
    .from(partnerPhotos)
    .where(and(eq(partnerPhotos.id, photoId), eq(partnerPhotos.allianceId, allianceId)))
    .limit(1);
  return p?.url ?? null;
}

// Returns the removed blob URL (the caller deletes the file), or null.
export async function removePartnerPhoto(db: PortalDb, allianceId: string, photoId: unknown) {
  if (!isUuid(photoId)) return null;
  const [p] = await db
    .delete(partnerPhotos)
    .where(and(eq(partnerPhotos.id, photoId), eq(partnerPhotos.allianceId, allianceId)))
    .returning({ url: partnerPhotos.blobUrl });
  return p?.url ?? null;
}

// ── documents ────────────────────────────────────────────────────────

const ownOrShared = (allianceId: string) =>
  and(
    eq(allianceDocuments.allianceId, allianceId),
    or(eq(allianceDocuments.visibleToPartner, true), eq(allianceDocuments.uploadedByPartner, true)),
  );

export async function listPartnerDocuments(db: PortalDb, allianceId: string) {
  return db
    .select({
      id: allianceDocuments.id,
      createdAt: allianceDocuments.createdAt,
      fileName: allianceDocuments.fileName,
      documentType: allianceDocuments.documentType,
      uploadedByPartner: allianceDocuments.uploadedByPartner,
    })
    .from(allianceDocuments)
    .where(ownOrShared(allianceId))
    .orderBy(desc(allianceDocuments.createdAt));
}

export async function getPartnerDocumentFile(db: PortalDb, allianceId: string, documentId: unknown) {
  if (!isUuid(documentId)) return null;
  const [d] = await db
    .select({ blobUrl: allianceDocuments.blobUrl, fileName: allianceDocuments.fileName })
    .from(allianceDocuments)
    .where(and(eq(allianceDocuments.id, documentId), ownOrShared(allianceId)))
    .limit(1);
  return d ?? null;
}

export async function isPartnerUploadLimitReached(db: PortalDb, allianceId: string, now = new Date()) {
  const since = new Date(now.getTime() - DAY_MS);
  const [docs] = await db
    .select({ n: count() })
    .from(allianceDocuments)
    .where(and(eq(allianceDocuments.allianceId, allianceId), eq(allianceDocuments.uploadedByPartner, true), gt(allianceDocuments.createdAt, since)));
  const [assets] = await db
    .select({ n: count() })
    .from(marketingContentAssets)
    .where(and(eq(marketingContentAssets.submittedByAllianceId, allianceId), gt(marketingContentAssets.createdAt, since)));
  const [contactDocs] = await db
    .select({ n: count() })
    .from(partnerContactDocuments)
    .where(and(eq(partnerContactDocuments.ownerAllianceId, allianceId), gt(partnerContactDocuments.createdAt, since)));
  return (docs?.n ?? 0) + (assets?.n ?? 0) + (contactDocs?.n ?? 0) >= PARTNER_MAX_UPLOADS_PER_DAY;
}

export const PARTNER_DOCUMENT_TYPES = ["contract", "w9", "license", "insurance", "alliance_agreement", "other"] as const;
export type PartnerDocumentType = (typeof PARTNER_DOCUMENT_TYPES)[number];

export async function recordPartnerDocumentUpload(
  db: PortalDb,
  params: {
    allianceId: string;
    fileName: string;
    blobUrl: string;
    documentType: PartnerDocumentType;
    sensitiveDataReason: string | null;
  },
) {
  const [doc] = await db
    .insert(allianceDocuments)
    .values({
      allianceId: params.allianceId,
      fileName: params.fileName,
      blobUrl: params.blobUrl,
      documentType: params.documentType,
      uploadedByPartner: true,
      visibleToPartner: true,
      sensitiveDataReason: params.sensitiveDataReason,
    })
    .returning({ id: allianceDocuments.id });
  await db.insert(tasks).values({
    allianceId: params.allianceId,
    type: "partner_document_review",
    title: `Review partner document (${params.documentType}): ${params.fileName}`,
  });
  return doc.id;
}

// ── marketing ────────────────────────────────────────────────────────

const sharedWithPartner = (allianceId: string) =>
  and(
    eq(marketingContentAssets.approvalStatus, "approved"),
    or(
      eq(marketingContentAssets.partnerShare, "all"),
      and(
        eq(marketingContentAssets.partnerShare, "selected"),
        sql`exists (select 1 from ${marketingAssetPartnerShares} s where s.asset_id = ${marketingContentAssets.id} and s.alliance_id = ${allianceId})`,
      ),
    ),
  );

export async function listPartnerMarketing(db: PortalDb, allianceId: string) {
  const shared = await db
    .select({
      id: marketingContentAssets.id,
      createdAt: marketingContentAssets.createdAt,
      fileName: marketingContentAssets.fileName,
      caption: marketingContentAssets.caption,
    })
    .from(marketingContentAssets)
    .where(sharedWithPartner(allianceId))
    .orderBy(desc(marketingContentAssets.createdAt));
  const submitted = await db
    .select({
      id: marketingContentAssets.id,
      createdAt: marketingContentAssets.createdAt,
      fileName: marketingContentAssets.fileName,
      caption: marketingContentAssets.caption,
      approvalStatus: marketingContentAssets.approvalStatus,
    })
    .from(marketingContentAssets)
    .where(eq(marketingContentAssets.submittedByAllianceId, allianceId))
    .orderBy(desc(marketingContentAssets.createdAt));
  return { shared, submitted };
}

export async function getPartnerMarketingFile(db: PortalDb, allianceId: string, assetId: unknown) {
  if (!isUuid(assetId)) return null;
  const [a] = await db
    .select({ blobUrl: marketingContentAssets.blobUrl, fileName: marketingContentAssets.fileName })
    .from(marketingContentAssets)
    .where(
      and(
        eq(marketingContentAssets.id, assetId),
        or(sharedWithPartner(allianceId), eq(marketingContentAssets.submittedByAllianceId, allianceId)),
      ),
    )
    .limit(1);
  return a ?? null;
}

export async function recordPartnerMarketingSubmission(
  db: PortalDb,
  params: { allianceId: string; fileName: string; blobUrl: string; caption: string },
) {
  const [asset] = await db
    .insert(marketingContentAssets)
    .values({
      fileName: params.fileName,
      blobUrl: params.blobUrl,
      caption: clean(params.caption, 500) || null,
      submittedByAllianceId: params.allianceId,
      approvalStatus: "pending",
      partnerShare: "none",
    })
    .returning({ id: marketingContentAssets.id });
  await db.insert(tasks).values({
    allianceId: params.allianceId,
    type: "partner_marketing_review",
    title: `Approve partner marketing material: ${params.fileName}`,
  });
  return asset.id;
}

// ── referrals ────────────────────────────────────────────────────────

const OPEN = ["new_referral", "registered", "consent_pending", "sent_to_partner"];
const CONTACTED = ["under_review", "documents_pending", "qualified", "service_in_progress"];
const CLOSED = ["closed_funded", "commission_due", "commission_paid"];
export type PartnerReferralStage = "new" | "contacted" | "closed" | "not_closed";
// What the SENDER of a network referral (option A) sees: sent to AMS, then
// assigned to an ally, then the usual stages.
export type PartnerSentStage = "sent" | "assigned" | PartnerReferralStage;

export function partnerReferralStage(pipelineStatus: string): PartnerReferralStage {
  if (OPEN.includes(pipelineStatus)) return "new";
  if (CONTACTED.includes(pipelineStatus)) return "contacted";
  if (CLOSED.includes(pipelineStatus)) return "closed";
  return "not_closed";
}

export async function listPartnerReferrals(db: PortalDb, allianceId: string) {
  // Sent TO the alliance — by AMS, or another ally's referral that AMS
  // assigned to it (option A): only the service and the note meant for it,
  // and the client's name/phone only with the client's partner-sharing
  // consent. Never the sending ally or its note.
  const toPartnerRows = await db
    .select({
      id: referrals.id,
      referralSeq: referrals.referralSeq,
      referralDate: referrals.referralDate,
      pipelineStatus: referrals.pipelineStatus,
      partnerNote: referrals.partnerNote,
      partnerService: referrals.partnerService,
      assignedAllianceId: referrals.assignedAllianceId,
      requestedService: referrals.requestedService,
      assigneeNote: referrals.assigneeNote,
      directReferral: referrals.directReferral,
      directName: referrals.partnerContactName,
      directPhone: referrals.partnerContactPhone,
      consent: clientCommunicationPreferences.partnerReferralConsent,
      clientName: clients.fullName,
      clientPhone: clients.phone,
    })
    .from(referrals)
    .innerJoin(clients, eq(clients.id, referrals.clientId))
    .leftJoin(clientCommunicationPreferences, eq(clientCommunicationPreferences.clientId, referrals.clientId))
    .where(
      or(
        and(eq(referrals.allianceId, allianceId), eq(referrals.createdByPartner, false)),
        eq(referrals.assignedAllianceId, allianceId),
      ),
    )
    .orderBy(desc(referrals.referralDate));
  const toPartner = toPartnerRows.map(
    ({ assignedAllianceId, requestedService, assigneeNote, partnerNote, partnerService, directReferral, directName, directPhone, ...r }) =>
      assignedAllianceId === allianceId
        ? {
            ...r,
            partnerNote: assigneeNote,
            partnerService: null,
            requestedService,
            // Option B: the sender confirmed the person's permission to share
            // their details with THIS ally, so it sees what the sender typed.
            ...(directReferral ? { consent: true, clientName: directName ?? "", clientPhone: directPhone } : {}),
          }
        : { ...r, partnerNote, partnerService, requestedService: null },
  );

  const assignee = aliasedTable(strategicAlliances, "assignee");

  const fromPartner = await db
    .select({
      id: referrals.id,
      referralSeq: referrals.referralSeq,
      referralDate: referrals.referralDate,
      pipelineStatus: referrals.pipelineStatus,
      name: referrals.partnerContactName,
      phone: referrals.partnerContactPhone,
      email: referrals.partnerContactEmail,
      service: referrals.partnerService,
      note: referrals.partnerNote,
      networkRouting: referrals.networkRouting,
      directReferral: referrals.directReferral,
      requestedService: referrals.requestedService,
      assignedAllianceId: referrals.assignedAllianceId,
      showAssignee: referrals.showAssigneeToSender,
      assigneeName: assignee.organizationName,
    })
    .from(referrals)
    .leftJoin(assignee, eq(assignee.id, referrals.assignedAllianceId))
    .where(and(eq(referrals.allianceId, allianceId), eq(referrals.createdByPartner, true)))
    .orderBy(desc(referrals.referralDate));

  return {
    toPartner: toPartner.map(({ consent, clientName, clientPhone, pipelineStatus, ...r }) => ({
      ...r,
      stage: partnerReferralStage(pipelineStatus),
      shared: consent === true,
      name: consent === true ? clientName : null,
      phone: consent === true ? clientPhone : null,
    })),
    fromPartner: fromPartner.map(({ pipelineStatus, assignedAllianceId, showAssignee, assigneeName, ...r }) => {
      const base = partnerReferralStage(pipelineStatus);
      const stage: PartnerSentStage = !r.networkRouting && !r.directReferral
        ? base
        : !assignedAllianceId
          ? "sent"
          : base === "new"
            ? "assigned"
            : base;
      // Who received it: the ally it chose (direct), or — option A — only
      // when staff ticked "show who it was assigned to".
      return {
        ...r,
        stage,
        assignedTo: (r.networkRouting || r.directReferral) && assignedAllianceId && showAssignee ? assigneeName : null,
      };
    }),
  };
}

export const PARTNER_SETTABLE_STAGES = ["contacted", "closed", "not_closed"] as const;
const STAGE_TO_STATUS = {
  contacted: { pipelineStatus: "under_review", status: "in_progress" },
  closed: { pipelineStatus: "closed_funded", status: "closed_won" },
  not_closed: { pipelineStatus: "declined", status: "closed_lost" },
} as const;

// The alliance updates a referral that was sent TO it (by AMS, or assigned
// to it from another ally) — never one it sent.
export async function setPartnerReferralStage(
  db: PortalDb,
  params: { allianceId: string; referralId: unknown; stage: unknown; now?: Date },
) {
  if (!isUuid(params.referralId)) throw new PartnerNotFoundError("Referral not found");
  if (!(PARTNER_SETTABLE_STAGES as readonly unknown[]).includes(params.stage)) throw new PartnerValidationError("stage");
  const next = STAGE_TO_STATUS[params.stage as (typeof PARTNER_SETTABLE_STAGES)[number]];
  const [row] = await db
    .update(referrals)
    .set({
      pipelineStatus: next.pipelineStatus,
      status: next.status,
      updatedAt: params.now ?? new Date(),
      ...(params.stage === "contacted" ? {} : { closedDate: businessDateString(params.now ?? new Date()) }),
    })
    .where(
      and(
        eq(referrals.id, params.referralId),
        or(
          and(eq(referrals.allianceId, params.allianceId), eq(referrals.createdByPartner, false)),
          and(isNotNull(referrals.assignedAllianceId), eq(referrals.assignedAllianceId, params.allianceId)),
        ),
      ),
    )
    .returning({ id: referrals.id, referralSeq: referrals.referralSeq });
  if (!row) throw new PartnerNotFoundError("Referral not found");
  return row;
}

// The alliance sends AMS a referral: becomes a Lead in Clients ("Added by
// [ally]") + a referral + a task. Never merged into an existing client
// automatically — a possible duplicate is only flagged in the staff task,
// and the alliance never learns whether the person was already a client.
export async function createPartnerReferral(
  db: PortalDb,
  params: {
    allianceId: string;
    input: unknown;
    permissionText: string;
    ipAddress: string | null;
    userAgent: string | null;
    now?: Date;
  },
) {
  const now = params.now ?? new Date();
  const input = (params.input && typeof params.input === "object" ? params.input : {}) as Record<string, unknown>;
  if (input.permission !== true) throw new PartnerValidationError("permission");
  const name = clean(input.name, 200);
  if (name.length < 2) throw new PartnerValidationError("name");
  const rawPhone = clean(input.phone, 30);
  const digits = rawPhone ? usPhoneDigits(rawPhone) : null;
  if (rawPhone && !digits) throw new PartnerValidationError("phone");
  const email = clean(input.email, 200).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new PartnerValidationError("email");
  if (!digits && !email) throw new PartnerValidationError("contact");
  const service =
    typeof input.service === "string" && (activeServiceTypeValues as readonly string[]).includes(input.service)
      ? (input.service as ServiceTypeValue)
      : null;
  const note = clean(input.note, 1000);
  // Option A: "send this referral to another ally of the AMS network".
  // Option B: straight to an ally from the network directory (directTo) —
  // only for an ally staff authorized, only to an ally in its directory.
  const wantsDirect = input.directTo !== undefined && input.directTo !== null && input.directTo !== "";
  if (wantsDirect && !isUuid(input.directTo)) throw new PartnerValidationError("directTo");
  const directTo: string | null = wantsDirect ? (input.directTo as string) : null;
  const network = input.network === true && !directTo;
  const requestedService = clean(input.requestedService, 200);
  if ((network || directTo) && requestedService.length < 2) throw new PartnerValidationError("requestedService");
  let directName = "";
  if (directTo) {
    if (directTo === params.allianceId) throw new PartnerValidationError("directTo");
    const [sender] = await db
      .select({ access: strategicAlliances.directoryAccess })
      .from(strategicAlliances)
      .where(eq(strategicAlliances.id, params.allianceId))
      .limit(1);
    const [target] = await db
      .select({ name: strategicAlliances.organizationName })
      .from(strategicAlliances)
      .where(and(eq(strategicAlliances.id, directTo), eq(strategicAlliances.directoryListed, true), eq(strategicAlliances.directoryOptIn, true)))
      .limit(1);
    if (!sender?.access || !target) throw new PartnerValidationError("directTo");
    directName = target.name;
  }

  const [recent] = await db
    .select({ n: count() })
    .from(referrals)
    .where(and(eq(referrals.allianceId, params.allianceId), eq(referrals.createdByPartner, true), gt(referrals.createdAt, new Date(now.getTime() - DAY_MS))));
  if ((recent?.n ?? 0) >= PARTNER_MAX_REFERRALS_PER_DAY) throw new PartnerLimitError("Too many referrals today");

  const ally = await allianceName(db, params.allianceId);
  const phone = digits ? formatUsPhone(digits) : null;

  // Possible duplicate (staff-only hint).
  const dupConditions = [
    ...(phone ? [eq(clients.phone, phone)] : []),
    ...(email ? [eq(clients.email, email)] : []),
  ];
  const [dup] = dupConditions.length
    ? await db.select({ name: clients.fullName }).from(clients).where(or(...dupConditions)).limit(1)
    : [];

  const [lead] = await db
    .insert(clients)
    .values({
      fullName: name,
      phone,
      email: email || null,
      status: "lead",
      preferredLanguage: "es",
      referralSource: `Aliado: ${ally}`.slice(0, 200),
      interestedServices: service ? [service] : null,
      notes: `Agregado por ${ally} (Diamante Conecta 360).${note ? ` Nota del aliado: ${note}` : ""}`,
      addedByAllianceId: params.allianceId,
    })
    .returning({ id: clients.id });

  const [referral] = await db
    .insert(referrals)
    .values({
      referralDate: businessDateString(now),
      category: "general",
      clientId: lead.id,
      allianceId: params.allianceId,
      referredBy: ally || "Partner",
      receivingParty: "Anthony Multiservice",
      direction: "other_partner_to_ams",
      pipelineStatus: "new_referral",
      status: "submitted",
      createdByPartner: true,
      partnerContactName: name,
      partnerContactPhone: phone,
      partnerContactEmail: email || null,
      partnerService: service,
      partnerNote: note || null,
      networkRouting: network,
      requestedService: network || directTo ? requestedService : null,
      ...(directTo
        ? {
            // Option B: it goes straight to that ally; the sender's note is
            // written for it. AMS gets a copy (task below).
            directReferral: true,
            assignedAllianceId: directTo,
            assignedAt: now,
            assigneeNote: note || null,
            showAssigneeToSender: true,
            receivingParty: directName,
            pipelineStatus: "sent_to_partner" as const,
            status: "in_progress" as const,
          }
        : {}),
      createdAt: now,
    })
    .returning({ id: referrals.id, referralSeq: referrals.referralSeq });

  // "My allies and contacts": what the ally typed, for its own list.
  const [contact] = await db
    .insert(partnerContacts)
    .values({
      ownerAllianceId: params.allianceId,
      kind: "person",
      name,
      phone,
      email: email || null,
      services: network || directTo ? requestedService : null,
      note: note || null,
      clientId: lead.id,
      referralId: referral.id,
      createdAt: now,
    })
    .returning({ id: partnerContacts.id });

  await recordPartnerConsent(db, {
    allianceId: params.allianceId,
    type: "contact_permission",
    textShown: params.permissionText,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    referralId: referral.id,
    now,
  });

  await db.insert(tasks).values({
    clientId: lead.id,
    allianceId: params.allianceId,
    referralId: referral.id,
    type: network ? "partner_referral_assign" : "partner_referral",
    title: network
      ? `Assign referral to an ally: ${name} needs "${requestedService}" (from ${ally})${dup ? ` — possible duplicate of ${dup.name}` : ""}`
      : directTo
        ? `Direct referral (copy for AMS) from ${ally} to ${directName}: ${name} needs "${requestedService}"${dup ? ` — possible duplicate of ${dup.name}` : ""}`
        : `New referral from ${ally}: ${name}${dup ? ` — possible duplicate of ${dup.name}` : ""}`,
    createdAt: now,
  });
  return { ...referral, clientId: lead.id, contactId: contact.id };
}

// ── contractor license / insurance alerts (daily cron) ───────────────

// One open "expiring" task per alliance (deduped), for contractor alliances
// whose license or insurance expires within `days`.
export async function createPartnerExpiryTasks(db: PortalDb, days: number, now = new Date()) {
  const today = businessDateString(now);
  const limit = businessDateString(new Date(now.getTime() + days * DAY_MS));
  const rows = await db
    .select({
      allianceId: partnerProfiles.allianceId,
      name: strategicAlliances.organizationName,
      license: partnerProfiles.licenseExpiration,
      insurance: partnerProfiles.insuranceExpiration,
    })
    .from(partnerProfiles)
    .innerJoin(strategicAlliances, eq(strategicAlliances.id, partnerProfiles.allianceId))
    .where(inArray(strategicAlliances.organizationType, ["contractor_remodeling", "installer_remodeling"]));
  let created = 0;
  for (const r of rows) {
    const expiring = [
      r.license && r.license <= limit ? `license ${r.license}` : null,
      r.insurance && r.insurance <= limit ? `insurance ${r.insurance}` : null,
    ].filter(Boolean);
    if (expiring.length === 0) continue;
    const [open] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.allianceId, r.allianceId), eq(tasks.type, "partner_license_expiring"), eq(tasks.status, "open")))
      .limit(1);
    if (open) continue;
    await db.insert(tasks).values({
      allianceId: r.allianceId,
      type: "partner_license_expiring",
      title: `Contractor license/insurance expiring: ${r.name} — ${expiring.join(", ")}`,
      dueDate: today,
      createdAt: now,
    });
    created += 1;
  }
  return created;
}


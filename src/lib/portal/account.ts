import { and, eq, gt, sql } from "drizzle-orm";
import { clientCommunicationPreferences, clientConsentEvents, clients, tasks } from "@/lib/db/schema";
import { businessDateString } from "@/lib/dates";
import { formatUsPhone, usPhoneDigits } from "@/lib/validation/onlineBooking";
import { portalProfileSchema, type BestTimeToCall } from "@/lib/validation/portalProfile";
import { serviceTypeValues } from "@/lib/validation/client";
import {
  PROFILE_BEST_TIME_LABELS_EN,
  PROFILE_FIELD_LABELS_EN,
  PROFILE_LANGUAGE_LABELS_EN,
  buildPortalProfileChangeTitle,
  buildPortalServiceInterestTitle,
} from "@/lib/booking/titles";
import type { ServiceType } from "@/lib/booking/config";
import { getLatestConsents, recordConsentEvent, type StaffConsentMethod } from "@/lib/legal/texts";
import type { PortalDb } from "./db";
import { PORTAL_AUTHORIZATIONS, type PortalAuthorization } from "./authorizationTypes";

// Client portal, Step 2B: My profile, profile photo, Services that
// interest me, My authorizations. Same rules as queries.ts:
//   1. clientId always comes from the resolved portal session and is
//      ALWAYS part of the WHERE clause.
//   2. Only the columns listed here are ever returned to the client.
// No Next.js imports — isolation.test.ts runs this exact code on PGlite.

const DAY_MS = 24 * 60 * 60 * 1000;

// Abuse guards (per client, rolling 24 hours).
export const PORTAL_MAX_PROFILE_CHANGES_PER_DAY = 10;
export const PORTAL_MAX_SERVICE_REQUESTS_PER_DAY = 5;
export const PORTAL_MAX_CONSENT_EVENTS_PER_DAY = 60;

export class PortalLimitError extends Error {}
export class PortalValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

async function countTasksSince(db: PortalDb, clientId: string, type: "client_info_review" | "service_interest", since: Date) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(eq(tasks.clientId, clientId), eq(tasks.type, type), gt(tasks.createdAt, since)));
  return row?.n ?? 0;
}

// ── My profile ────────────────────────────────────────────────────────

export async function getPortalProfile(db: PortalDb, clientId: string) {
  const [row] = await db
    .select({
      fullName: clients.fullName,
      phone: clients.phone,
      email: clients.email,
      address: clients.address,
      preferredLanguage: clients.preferredLanguage,
      bestTimeToCall: clients.bestTimeToCall,
      photoBlobUrl: clients.photoBlobUrl,
    })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!row) return null;
  const { photoBlobUrl, ...rest } = row;
  return {
    ...rest,
    phone: rest.phone ?? "",
    email: rest.email ?? "",
    address: rest.address ?? "",
    bestTimeToCall: rest.bestTimeToCall ?? ("" as const),
    hasPhoto: Boolean(photoBlobUrl),
  };
}

// English labels for the staff task (stored in English, like every other
// system-generated task title, and translated at display time).
const FIELD_LABELS_EN = PROFILE_FIELD_LABELS_EN;
const LANGUAGE_EN = PROFILE_LANGUAGE_LABELS_EN;
const BEST_TIME_EN: Record<BestTimeToCall, string> = PROFILE_BEST_TIME_LABELS_EN;

export type ProfileUpdateResult = { changed: (keyof typeof FIELD_LABELS_EN)[] };

// Saves the client's own contact details directly (owner-approved), and
// creates one "Review client info change" task with before → after. The
// full name is never editable here. Nothing changed → nothing written.
export async function updatePortalProfile(
  db: PortalDb,
  params: { clientId: string; values: unknown; now?: Date },
): Promise<ProfileUpdateResult> {
  const now = params.now ?? new Date();
  const parsed = portalProfileSchema.safeParse(params.values);
  if (!parsed.success) throw new PortalValidationError(parsed.error.issues[0]?.message ?? "invalid");
  const v = parsed.data;

  const [current] = await db
    .select({
      phone: clients.phone,
      email: clients.email,
      address: clients.address,
      preferredLanguage: clients.preferredLanguage,
      bestTimeToCall: clients.bestTimeToCall,
    })
    .from(clients)
    .where(eq(clients.id, params.clientId))
    .limit(1);
  if (!current) throw new PortalValidationError("not_found");

  const next = {
    phone: formatUsPhone(usPhoneDigits(v.phone)!),
    email: v.email.toLowerCase(),
    address: v.address,
    preferredLanguage: v.preferredLanguage,
    bestTimeToCall: v.bestTimeToCall,
  };

  const changes: { field: keyof typeof FIELD_LABELS_EN; before: string; after: string }[] = [];
  // Phone compared by digits, so re-saving "(407) 555-0101" over
  // "407-555-0101" isn't a change.
  if ((current.phone ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "") !== usPhoneDigits(v.phone)) {
    changes.push({ field: "phone", before: current.phone ?? "", after: next.phone });
  }
  if ((current.email ?? "").trim().toLowerCase() !== next.email) {
    changes.push({ field: "email", before: current.email ?? "", after: next.email });
  }
  if ((current.address ?? "").trim() !== next.address) {
    changes.push({ field: "address", before: current.address ?? "", after: next.address });
  }
  if (current.preferredLanguage !== next.preferredLanguage) {
    changes.push({
      field: "preferredLanguage",
      before: LANGUAGE_EN[current.preferredLanguage],
      after: LANGUAGE_EN[next.preferredLanguage],
    });
  }
  if ((current.bestTimeToCall ?? "") !== next.bestTimeToCall) {
    changes.push({
      field: "bestTimeToCall",
      before: current.bestTimeToCall ? BEST_TIME_EN[current.bestTimeToCall] : "",
      after: next.bestTimeToCall ? BEST_TIME_EN[next.bestTimeToCall] : "",
    });
  }
  if (changes.length === 0) return { changed: [] };

  if (
    (await countTasksSince(db, params.clientId, "client_info_review", new Date(now.getTime() - DAY_MS))) >=
    PORTAL_MAX_PROFILE_CHANGES_PER_DAY
  ) {
    throw new PortalLimitError("Too many profile changes today");
  }

  const set: Partial<typeof clients.$inferInsert> = {};
  for (const c of changes) {
    if (c.field === "phone") set.phone = next.phone;
    if (c.field === "email") set.email = next.email || null;
    if (c.field === "address") set.address = next.address || null;
    if (c.field === "preferredLanguage") set.preferredLanguage = next.preferredLanguage;
    if (c.field === "bestTimeToCall") set.bestTimeToCall = next.bestTimeToCall || null;
  }
  await db.update(clients).set(set).where(eq(clients.id, params.clientId));

  await db.insert(tasks).values({
    clientId: params.clientId,
    type: "client_info_review",
    title: buildPortalProfileChangeTitle(
      changes.map((c) => ({ label: FIELD_LABELS_EN[c.field], before: c.before, after: c.after })),
      changes.some((c) => c.field === "phone"),
    ),
    createdAt: now,
  });
  return { changed: changes.map((c) => c.field) };
}

// ── profile photo ─────────────────────────────────────────────────────

// Internal: the stored blob URL, only for the photo routes to stream it.
export async function getPortalPhotoBlobUrl(db: PortalDb, clientId: string) {
  const [row] = await db
    .select({ photoBlobUrl: clients.photoBlobUrl })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  return row?.photoBlobUrl ?? null;
}

// Points the client at a new photo (or none) and returns the previous
// blob URL so the caller can delete it from storage.
export async function setPortalPhoto(db: PortalDb, clientId: string, blobUrl: string | null) {
  const previous = await getPortalPhotoBlobUrl(db, clientId);
  await db.update(clients).set({ photoBlobUrl: blobUrl }).where(eq(clients.id, clientId));
  return previous;
}

// ── Services that interest me ─────────────────────────────────────────

// Every CRM service type except the legacy "online_notary" (folded into
// "notary"), in the CRM's own order.
export const PORTAL_SERVICE_TYPES: readonly ServiceType[] = serviceTypeValues.filter(
  (s) => s !== "online_notary",
);

export async function getPortalInterestedServices(db: PortalDb, clientId: string): Promise<ServiceType[]> {
  const [row] = await db
    .select({ interestedServices: clients.interestedServices })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  return [...new Set(row?.interestedServices ?? [])];
}

// Adds the chosen services to the client's "Interested Services" (no
// duplicates — the list is also de-duplicated if it already had any) and
// creates one "Client requested information about: …" task. Never creates
// a case or an invoice. Services the client already had are kept.
export async function requestPortalServices(
  db: PortalDb,
  params: { clientId: string; services: unknown; comment: unknown; now?: Date },
): Promise<{ added: ServiceType[] }> {
  const now = params.now ?? new Date();
  const comment = typeof params.comment === "string" ? params.comment.replace(/[\u0000-\u001f\u007f<>]/g, " ").trim() : "";
  if (comment.length > 500) throw new PortalValidationError("comment");
  if (!Array.isArray(params.services) || params.services.length > PORTAL_SERVICE_TYPES.length) {
    throw new PortalValidationError("invalid");
  }
  const requested = [...new Set(params.services)];
  if (!requested.every((s): s is ServiceType => (PORTAL_SERVICE_TYPES as readonly unknown[]).includes(s))) {
    throw new PortalValidationError("invalid");
  }
  if (requested.length === 0 && comment === "") throw new PortalValidationError("empty");

  if (
    (await countTasksSince(db, params.clientId, "service_interest", new Date(now.getTime() - DAY_MS))) >=
    PORTAL_MAX_SERVICE_REQUESTS_PER_DAY
  ) {
    throw new PortalLimitError("Too many service requests today");
  }

  const current = await getPortalInterestedServices(db, params.clientId);
  const added = requested.filter((s) => !current.includes(s));
  const merged = [...current, ...added];
  await db
    .update(clients)
    .set({ interestedServices: merged.length ? merged : null })
    .where(eq(clients.id, params.clientId));

  await db.insert(tasks).values({
    clientId: params.clientId,
    type: "service_interest",
    title: buildPortalServiceInterestTitle(requested, comment),
    createdAt: now,
  });
  return { added };
}

// ── My authorizations ─────────────────────────────────────────────────

export { PORTAL_AUTHORIZATIONS, type PortalAuthorization };

const CHANNEL_COLUMNS = {
  phone_calls: "phoneCallConsent",
  whatsapp: "whatsappConsent",
  sms: "smsConsent",
  email: "emailConsent",
  marketing: "marketingConsent",
} as const;
type ChannelAuthorization = keyof typeof CHANNEL_COLUMNS;
export const STAFF_CHANNEL_AUTHORIZATIONS = Object.keys(CHANNEL_COLUMNS) as ChannelAuthorization[];
const isChannel = (a: PortalAuthorization): a is ChannelAuthorization => a in CHANNEL_COLUMNS;

export type PortalAuthorizationState = Record<
  PortalAuthorization,
  { granted: boolean; at: Date | null; signatureName?: string | null }
>;

export async function getPortalAuthorizations(db: PortalDb, clientId: string): Promise<PortalAuthorizationState> {
  const [prefs] = await db
    .select({
      phoneCallConsent: clientCommunicationPreferences.phoneCallConsent,
      whatsappConsent: clientCommunicationPreferences.whatsappConsent,
      smsConsent: clientCommunicationPreferences.smsConsent,
      emailConsent: clientCommunicationPreferences.emailConsent,
      marketingConsent: clientCommunicationPreferences.marketingConsent,
    })
    .from(clientCommunicationPreferences)
    .where(eq(clientCommunicationPreferences.clientId, clientId))
    .limit(1);
  const latest = await getLatestConsents(db, clientId);

  const state = {} as PortalAuthorizationState;
  for (const a of PORTAL_AUTHORIZATIONS) {
    const event = latest[a];
    if (isChannel(a)) {
      state[a] = { granted: prefs?.[CHANNEL_COLUMNS[a]] ?? false, at: event?.createdAt ?? null };
    } else {
      state[a] = {
        granted: event?.granted ?? false,
        at: event?.createdAt ?? null,
        signatureName: event?.granted ? event.signatureName : null,
      };
    }
  }
  return state;
}

type ChannelStatuses = {
  emailStatus: string;
  smsStatus: string;
  whatsappContactStatus: string;
} | null;

// Mirrors one channel switch into Communication Preferences: the consent
// boolean, the consent/opt-out date, and the channel status — withdrawing
// marks the channel opted out / unsubscribed, so the CRM never shows it as
// usable; consenting again reactivates only a channel that was opted out
// (a bounced or invalid address stays as staff marked it).
function channelPatch(
  a: ChannelAuthorization,
  granted: boolean,
  today: string,
  statuses: ChannelStatuses,
  consentSource = "Client portal",
) {
  const patch: Partial<typeof clientCommunicationPreferences.$inferInsert> = {
    [CHANNEL_COLUMNS[a]]: granted,
  };
  if (granted) {
    patch.consentDate = today;
    patch.consentSource = consentSource;
  } else {
    patch.optOutDate = today;
  }
  if (a === "email") {
    if (!granted) patch.emailStatus = "unsubscribed";
    else if (!statuses || ["unsubscribed", "consent_pending"].includes(statuses.emailStatus)) patch.emailStatus = "active";
  }
  if (a === "sms") {
    if (!granted) patch.smsStatus = "opted_out";
    else if (!statuses || ["opted_out", "consent_pending"].includes(statuses.smsStatus)) patch.smsStatus = "active";
  }
  if (a === "whatsapp") {
    if (!granted) patch.whatsappContactStatus = "opted_out";
    else if (statuses?.whatsappContactStatus === "opted_out") patch.whatsappContactStatus = "consent_pending";
  }
  return patch;
}

export type AuthorizationTexts = Record<PortalAuthorization, string>;

// Saves the client's choices. Only boxes whose value actually changed are
// recorded — each as its own append-only consent event (date/time, IP,
// browser, the exact text shown, and for document processing the typed
// name as a simple signature). Returns what changed, for the audit log.
export async function savePortalAuthorizations(
  db: PortalDb,
  params: {
    clientId: string;
    choices: unknown;
    signatureName: unknown;
    texts: AuthorizationTexts;
    ipAddress: string | null;
    userAgent: string | null;
    now?: Date;
  },
): Promise<{ changed: { type: PortalAuthorization; granted: boolean }[] }> {
  const now = params.now ?? new Date();
  const choices = params.choices as Record<string, unknown> | null;
  if (!choices || typeof choices !== "object") throw new PortalValidationError("invalid");
  for (const a of PORTAL_AUTHORIZATIONS) {
    if (typeof choices[a] !== "boolean") throw new PortalValidationError("invalid");
  }

  const current = await getPortalAuthorizations(db, params.clientId);
  const changed = PORTAL_AUTHORIZATIONS.filter((a) => current[a].granted !== choices[a]).map((a) => ({
    type: a,
    granted: choices[a] as boolean,
  }));
  if (changed.length === 0) return { changed: [] };

  const signatureName =
    typeof params.signatureName === "string" ? params.signatureName.replace(/[\u0000-\u001f\u007f<>]/g, " ").trim() : "";
  if (changed.some((c) => c.type === "document_processing" && c.granted)) {
    if (signatureName.length < 2 || signatureName.length > 200) throw new PortalValidationError("signature");
  }

  const [recent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(clientConsentEvents)
    .where(
      and(
        eq(clientConsentEvents.clientId, params.clientId),
        eq(clientConsentEvents.source, "portal"),
        gt(clientConsentEvents.createdAt, new Date(now.getTime() - DAY_MS)),
      ),
    );
  if ((recent?.n ?? 0) + changed.length > PORTAL_MAX_CONSENT_EVENTS_PER_DAY) {
    throw new PortalLimitError("Too many authorization changes today");
  }

  const today = businessDateString(now);
  const [statuses] = await db
    .select({
      emailStatus: clientCommunicationPreferences.emailStatus,
      smsStatus: clientCommunicationPreferences.smsStatus,
      whatsappContactStatus: clientCommunicationPreferences.whatsappContactStatus,
    })
    .from(clientCommunicationPreferences)
    .where(eq(clientCommunicationPreferences.clientId, params.clientId))
    .limit(1);
  let prefsPatch: Partial<typeof clientCommunicationPreferences.$inferInsert> = {};
  for (const c of changed) {
    if (isChannel(c.type)) prefsPatch = { ...prefsPatch, ...channelPatch(c.type, c.granted, today, statuses ?? null) };
  }
  if (Object.keys(prefsPatch).length > 0) {
    await db
      .insert(clientCommunicationPreferences)
      .values({ clientId: params.clientId, ...prefsPatch, updatedAt: now })
      .onConflictDoUpdate({
        target: clientCommunicationPreferences.clientId,
        set: { ...prefsPatch, updatedAt: now },
      });
  }

  for (const c of changed) {
    await recordConsentEvent(db, {
      clientId: params.clientId,
      consentType: c.type,
      granted: c.granted,
      source: "portal",
      textShown: params.texts[c.type],
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      signatureName: c.type === "document_processing" && c.granted ? signatureName : null,
      now,
    });
  }
  return { changed };
}

// Staff marked one channel permission by hand from the client record's
// Authorizations card ("the client gave permission by phone"). Same mirror
// into Communication Preferences as the portal, and the same append-only
// consent history — source "staff", plus who marked it, how the client
// gave it, and an optional note.
export async function recordStaffChannelConsent(
  db: PortalDb,
  params: {
    clientId: string;
    type: ChannelAuthorization;
    granted: boolean;
    method: StaffConsentMethod;
    note: string | null;
    recordedBy: string | null;
    now?: Date;
  },
) {
  const now = params.now ?? new Date();
  const [statuses] = await db
    .select({
      emailStatus: clientCommunicationPreferences.emailStatus,
      smsStatus: clientCommunicationPreferences.smsStatus,
      whatsappContactStatus: clientCommunicationPreferences.whatsappContactStatus,
    })
    .from(clientCommunicationPreferences)
    .where(eq(clientCommunicationPreferences.clientId, params.clientId))
    .limit(1);
  const patch = channelPatch(
    params.type,
    params.granted,
    businessDateString(now),
    statuses ?? null,
    `Staff (${params.method})`,
  );
  await db
    .insert(clientCommunicationPreferences)
    .values({ clientId: params.clientId, ...patch, updatedAt: now })
    .onConflictDoUpdate({
      target: clientCommunicationPreferences.clientId,
      set: { ...patch, updatedAt: now },
    });
  await recordConsentEvent(db, {
    clientId: params.clientId,
    consentType: params.type,
    granted: params.granted,
    source: "staff",
    textShown: `Marked by staff in the CRM (Authorizations) — client gave permission: ${params.method}`,
    ipAddress: null,
    userAgent: null,
    recordedBy: params.recordedBy,
    staffMethod: params.method,
    note: params.note,
    now,
  });
}

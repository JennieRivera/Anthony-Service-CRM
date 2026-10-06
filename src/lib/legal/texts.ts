import { and, desc, eq, inArray } from "drizzle-orm";
import { clientConsentEvents, clients, legalTexts } from "@/lib/db/schema";
import type { PortalDb } from "@/lib/portal/db";
import { DEFAULT_LEGAL_TEXTS, LEGAL_TEXT_KEYS, type LegalTexts, type StaffConsentMethod } from "./keys";

export * from "./keys";

// Legal / disclosure texts (Settings → Legal texts): database reads and the
// append-only consent evidence. Keys and defaults live in ./keys.

export async function getLegalTexts(db: PortalDb): Promise<LegalTexts> {
  const rows = await db.select().from(legalTexts).where(inArray(legalTexts.key, [...LEGAL_TEXT_KEYS]));
  const saved = new Map(rows.map((r) => [r.key, r]));
  return Object.fromEntries(
    LEGAL_TEXT_KEYS.map((key) => {
      const row = saved.get(key);
      return [key, row ? { en: row.textEn, es: row.textEs } : DEFAULT_LEGAL_TEXTS[key]];
    }),
  ) as LegalTexts;
}


// ── consent / acknowledgment evidence ────────────────────────────────

// not_a_law_firm: the mandatory acknowledgment (2A). The rest are the
// portal's "My authorizations" page (2B); the five channel ones mirror the
// switches in client_communication_preferences — see
// src/lib/portal/authorizations.ts.
export const CONSENT_TYPES = [
  "not_a_law_firm",
  "phone_calls",
  "whatsapp",
  "sms",
  "email",
  "marketing",
  "document_processing",
  "privacy_notice",
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export async function recordConsentEvent(
  db: PortalDb,
  params: {
    clientId: string;
    appointmentId?: string | null;
    consentType: ConsentType;
    granted: boolean;
    source: "portal" | "online_booking" | "staff" | "sms_reply";
    textShown: string;
    ipAddress: string | null;
    userAgent: string | null;
    signatureName?: string | null;
    recordedBy?: string | null;
    staffMethod?: StaffConsentMethod | null;
    note?: string | null;
    now?: Date;
  },
) {
  const [client] = await db
    .select({ fullName: clients.fullName })
    .from(clients)
    .where(eq(clients.id, params.clientId))
    .limit(1);
  await db.insert(clientConsentEvents).values({
    clientId: params.clientId,
    clientNameSnapshot: client?.fullName ?? "",
    appointmentId: params.appointmentId ?? null,
    consentType: params.consentType,
    granted: params.granted,
    source: params.source,
    textShown: params.textShown,
    ipAddress: params.ipAddress?.slice(0, 64) ?? null,
    userAgent: params.userAgent?.slice(0, 400) ?? null,
    signatureName: params.signatureName?.slice(0, 200) ?? null,
    recordedBy: params.recordedBy?.slice(0, 200) ?? null,
    staffMethod: params.staffMethod ?? null,
    note: params.note?.slice(0, 500) ?? null,
    ...(params.now ? { createdAt: params.now } : {}),
  });
}

// Current state = the latest event for (client, type).
export async function hasGrantedConsent(db: PortalDb, clientId: string, consentType: ConsentType) {
  const [latest] = await db
    .select({ granted: clientConsentEvents.granted })
    .from(clientConsentEvents)
    .where(and(eq(clientConsentEvents.clientId, clientId), eq(clientConsentEvents.consentType, consentType)))
    .orderBy(desc(clientConsentEvents.createdAt))
    .limit(1);
  return latest?.granted === true;
}

export type LatestConsent = {
  granted: boolean;
  createdAt: Date;
  source: "portal" | "online_booking" | "staff" | "sms_reply";
  signatureName: string | null;
  recordedBy: string | null;
  staffMethod: StaffConsentMethod | null;
  note: string | null;
};

// Latest event per consent type for one client (types never recorded are
// simply absent).
export async function getLatestConsents(
  db: PortalDb,
  clientId: string,
): Promise<Partial<Record<ConsentType, LatestConsent>>> {
  const rows = await db
    .selectDistinctOn([clientConsentEvents.consentType], {
      consentType: clientConsentEvents.consentType,
      granted: clientConsentEvents.granted,
      createdAt: clientConsentEvents.createdAt,
      source: clientConsentEvents.source,
      signatureName: clientConsentEvents.signatureName,
      recordedBy: clientConsentEvents.recordedBy,
      staffMethod: clientConsentEvents.staffMethod,
      note: clientConsentEvents.note,
    })
    .from(clientConsentEvents)
    .where(eq(clientConsentEvents.clientId, clientId))
    .orderBy(clientConsentEvents.consentType, desc(clientConsentEvents.createdAt));
  const out: Partial<Record<ConsentType, LatestConsent>> = {};
  for (const { consentType, ...rest } of rows) {
    if ((CONSENT_TYPES as readonly string[]).includes(consentType)) out[consentType as ConsentType] = rest;
  }
  return out;
}

// Full history (newest first) for the staff view on the client record.
export async function listConsentEvents(db: PortalDb, clientId: string, limit = 50) {
  return db
    .select({
      id: clientConsentEvents.id,
      createdAt: clientConsentEvents.createdAt,
      consentType: clientConsentEvents.consentType,
      granted: clientConsentEvents.granted,
      source: clientConsentEvents.source,
      ipAddress: clientConsentEvents.ipAddress,
      signatureName: clientConsentEvents.signatureName,
      recordedBy: clientConsentEvents.recordedBy,
      staffMethod: clientConsentEvents.staffMethod,
      note: clientConsentEvents.note,
    })
    .from(clientConsentEvents)
    .where(eq(clientConsentEvents.clientId, clientId))
    .orderBy(desc(clientConsentEvents.createdAt))
    .limit(limit);
}

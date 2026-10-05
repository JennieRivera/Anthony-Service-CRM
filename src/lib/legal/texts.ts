import { and, desc, eq, inArray } from "drizzle-orm";
import { clientConsentEvents, clients, legalTexts } from "@/lib/db/schema";
import type { PortalDb } from "@/lib/portal/db";
import { DEFAULT_LEGAL_TEXTS, LEGAL_TEXT_KEYS, type LegalTexts } from "./keys";

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

export const CONSENT_TYPES = ["not_a_law_firm"] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export async function recordConsentEvent(
  db: PortalDb,
  params: {
    clientId: string;
    appointmentId?: string | null;
    consentType: ConsentType;
    granted: boolean;
    source: "portal" | "online_booking";
    textShown: string;
    ipAddress: string | null;
    userAgent: string | null;
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

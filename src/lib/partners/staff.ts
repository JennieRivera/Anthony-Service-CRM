import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, partnerConsentEvents, partnerPhotos, partnerProfiles } from "@/lib/db/schema";
import { addDays, businessDateString } from "@/lib/dates";
import type { PortalDb } from "@/lib/portal/db";
import { PARTNER_EXPIRY_ALERT_DAYS } from "./config";
import { getPartnerAccessSummary } from "./access";

// Staff (CRM) view of what an alliance did in its partner portal. Read by
// the alliance record page — never by the partner portal itself.
export async function getPartnerStaffView(allianceId: string) {
  const db = getDb();
  const [[profile], photos, added, terms, summary] = await Promise.all([
    db.select().from(partnerProfiles).where(eq(partnerProfiles.allianceId, allianceId)).limit(1),
    db
      .select({ id: partnerPhotos.id, fileName: partnerPhotos.fileName })
      .from(partnerPhotos)
      .where(eq(partnerPhotos.allianceId, allianceId))
      .orderBy(partnerPhotos.createdAt),
    db
      .select({ id: clients.id, fullName: clients.fullName, createdAt: clients.createdAt })
      .from(clients)
      .where(eq(clients.addedByAllianceId, allianceId))
      .orderBy(desc(clients.createdAt)),
    db
      .select({ createdAt: partnerConsentEvents.createdAt, ipAddress: partnerConsentEvents.ipAddress })
      .from(partnerConsentEvents)
      .where(and(eq(partnerConsentEvents.allianceId, allianceId), eq(partnerConsentEvents.consentType, "partner_terms")))
      .orderBy(desc(partnerConsentEvents.createdAt))
      .limit(1),
    getPartnerAccessSummary(db as unknown as PortalDb, allianceId),
  ]);

  const today = businessDateString();
  const alertBy = addDays(today, PARTNER_EXPIRY_ALERT_DAYS);
  const expiry = (date: string | null | undefined) =>
    !date ? null : date < today ? "expired" : date <= alertBy ? "soon" : "ok";

  return {
    profile: profile ?? null,
    photos,
    addedClients: added,
    termsAcceptedAt: terms[0]?.createdAt ?? null,
    termsIp: terms[0]?.ipAddress ?? null,
    access: summary,
    licenseStatus: expiry(profile?.licenseExpiration),
    insuranceStatus: expiry(profile?.insuranceExpiration),
  };
}

export async function getPartnerFileUrlForStaff(allianceId: string, which: "logo" | { photoId: string }) {
  const db = getDb();
  if (which === "logo") {
    const [p] = await db.select({ url: partnerProfiles.logoBlobUrl }).from(partnerProfiles).where(eq(partnerProfiles.allianceId, allianceId)).limit(1);
    return p?.url ?? null;
  }
  const [p] = await db
    .select({ url: partnerPhotos.blobUrl })
    .from(partnerPhotos)
    .where(and(eq(partnerPhotos.id, which.photoId), eq(partnerPhotos.allianceId, allianceId)))
    .limit(1);
  return p?.url ?? null;
}

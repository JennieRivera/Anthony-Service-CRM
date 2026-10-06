import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { partnerProfiles, partnerServices, strategicAlliances } from "@/lib/db/schema";
import type { PortalDb } from "@/lib/portal/db";
import { PartnerNotFoundError, isUuid, recordPartnerConsent } from "./queries";

// "Network directory" (partner portal, Phase B, option B — off by
// default). The rules, tested in isolation.test.ts:
//   1. Only an ally staff authorized (directoryAccess) can open it.
//   2. It lists only allies staff marked (directoryListed) AND that
//      accepted it in their own portal (directoryOptIn) — never the viewer.
//   3. It shows ONLY business name, type, services, city and logo: never
//      phones, emails, clients, notes or anyone's network.

const visible = and(eq(strategicAlliances.directoryListed, true), eq(strategicAlliances.directoryOptIn, true));

export async function getDirectoryStatus(db: PortalDb, allianceId: string) {
  const [a] = await db
    .select({
      access: strategicAlliances.directoryAccess,
      listed: strategicAlliances.directoryListed,
      optIn: strategicAlliances.directoryOptIn,
    })
    .from(strategicAlliances)
    .where(eq(strategicAlliances.id, allianceId))
    .limit(1);
  return a ?? { access: false, listed: false, optIn: false };
}

export type DirectoryEntry = {
  id: string;
  name: string;
  type: string | null;
  services: string[];
  city: string | null;
  hasLogo: boolean;
};

export async function listNetworkDirectory(db: PortalDb, viewerAllianceId: string): Promise<DirectoryEntry[]> {
  if (!(await getDirectoryStatus(db, viewerAllianceId)).access) throw new PartnerNotFoundError("No directory access");
  const rows = await db
    .select({
      id: strategicAlliances.id,
      name: strategicAlliances.organizationName,
      type: strategicAlliances.organizationType,
      city: strategicAlliances.city,
      logo: partnerProfiles.logoBlobUrl,
    })
    .from(strategicAlliances)
    .leftJoin(partnerProfiles, eq(partnerProfiles.allianceId, strategicAlliances.id))
    .where(and(visible, ne(strategicAlliances.id, viewerAllianceId)))
    .orderBy(asc(strategicAlliances.organizationName));
  const services = rows.length
    ? await db
        .select({ allianceId: partnerServices.allianceId, name: partnerServices.name })
        .from(partnerServices)
        .where(
          inArray(
            partnerServices.allianceId,
            rows.map((r) => r.id),
          ),
        )
        .orderBy(asc(partnerServices.createdAt))
    : [];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    city: r.city,
    hasLogo: Boolean(r.logo),
    services: services.filter((s) => s.allianceId === r.id).map((s) => s.name),
  }));
}

// True when `viewer` may open the directory and `targetId` is in it.
export async function isInViewersDirectory(db: PortalDb, viewerAllianceId: string, targetId: unknown) {
  if (!isUuid(targetId) || targetId === viewerAllianceId) return false;
  if (!(await getDirectoryStatus(db, viewerAllianceId)).access) return false;
  const [row] = await db
    .select({ id: strategicAlliances.id })
    .from(strategicAlliances)
    .where(and(eq(strategicAlliances.id, targetId), visible))
    .limit(1);
  return Boolean(row);
}

// A listed ally's logo, for a viewer allowed to see the directory.
export async function getDirectoryLogoUrl(db: PortalDb, viewerAllianceId: string, targetId: unknown) {
  if (!(await isInViewersDirectory(db, viewerAllianceId, targetId))) return null;
  const [p] = await db
    .select({ url: partnerProfiles.logoBlobUrl })
    .from(partnerProfiles)
    .where(eq(partnerProfiles.allianceId, targetId as string))
    .limit(1);
  return p?.url ?? null;
}

// The ally's own "show my business in the network directory" checkbox.
// Accepting is stored as consent evidence (date, IP, exact text).
export async function setDirectoryOptIn(
  db: PortalDb,
  params: { allianceId: string; optIn: boolean; textShown: string; ipAddress: string | null; userAgent: string | null; now?: Date },
) {
  const now = params.now ?? new Date();
  await db
    .update(strategicAlliances)
    .set({ directoryOptIn: params.optIn, updatedAt: now })
    .where(eq(strategicAlliances.id, params.allianceId));
  await recordPartnerConsent(db, {
    allianceId: params.allianceId,
    type: "directory_listing",
    textShown: params.textShown,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    granted: params.optIn,
    now,
  });
}

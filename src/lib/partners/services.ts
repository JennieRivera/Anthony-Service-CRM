import { and, asc, count, eq, gt } from "drizzle-orm";
import { partnerServices, tasks } from "@/lib/db/schema";
import type { PortalDb } from "@/lib/portal/db";
import { PARTNER_MAX_PROFILE_CHANGES_PER_DAY, PARTNER_MAX_SERVICES } from "./config";
import { PartnerLimitError, PartnerValidationError, isUuid } from "./queries";

// "My services" in the partner portal: the alliance adds, edits and removes
// the services it offers. Same rules as the rest of the portal: allianceId
// always comes from the session and is always in the WHERE clause. Every
// change creates a review task for staff (counted against the same daily
// limit as profile changes), and the list shows on the Alliance record.

const DAY_MS = 24 * 60 * 60 * 1000;
const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/g, "").trim().slice(0, max) : "";

export const PARTNER_SERVICE_LIMITS = { name: 120, description: 500, serviceArea: 200 } as const;

export type PartnerServiceRow = {
  id: string;
  name: string;
  description: string | null;
  serviceArea: string | null;
  priceFrom: string | null;
};

export async function listPartnerServices(db: PortalDb, allianceId: string): Promise<PartnerServiceRow[]> {
  return db
    .select({
      id: partnerServices.id,
      name: partnerServices.name,
      description: partnerServices.description,
      serviceArea: partnerServices.serviceArea,
      priceFrom: partnerServices.priceFrom,
    })
    .from(partnerServices)
    .where(eq(partnerServices.allianceId, allianceId))
    .orderBy(asc(partnerServices.createdAt));
}

function parseService(input: unknown) {
  if (!input || typeof input !== "object") throw new PartnerValidationError("invalid");
  const v = input as Record<string, unknown>;
  const name = clean(v.name, PARTNER_SERVICE_LIMITS.name);
  if (!name) throw new PartnerValidationError("name");
  const rawPrice = typeof v.priceFrom === "string" ? v.priceFrom.replace(/[$,\s]/g, "") : v.priceFrom == null ? "" : String(v.priceFrom);
  let priceFrom: string | null = null;
  if (rawPrice !== "") {
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(rawPrice)) throw new PartnerValidationError("price");
    priceFrom = Number(rawPrice).toFixed(2);
  }
  return {
    name,
    description: clean(v.description, PARTNER_SERVICE_LIMITS.description) || null,
    serviceArea: clean(v.serviceArea, PARTNER_SERVICE_LIMITS.serviceArea) || null,
    priceFrom,
  };
}

async function reviewTask(db: PortalDb, allianceId: string, title: string, now: Date) {
  const [row] = await db
    .select({ n: count() })
    .from(tasks)
    .where(and(eq(tasks.allianceId, allianceId), eq(tasks.type, "partner_profile_review"), gt(tasks.createdAt, new Date(now.getTime() - DAY_MS))));
  if ((row?.n ?? 0) >= PARTNER_MAX_PROFILE_CHANGES_PER_DAY) throw new PartnerLimitError("Too many profile changes today");
  return async () => {
    await db.insert(tasks).values({ allianceId, type: "partner_profile_review", title: title.slice(0, 2000), createdAt: now });
  };
}

const describe = (s: { name: string; priceFrom: string | null }) => (s.priceFrom ? `${s.name} (from $${s.priceFrom})` : s.name);

// Adds a service (no id) or edits one of the alliance's own (id).
export async function savePartnerService(
  db: PortalDb,
  params: { allianceId: string; id?: unknown; values: unknown; now?: Date },
): Promise<PartnerServiceRow> {
  const now = params.now ?? new Date();
  const values = parseService(params.values);

  if (params.id === undefined || params.id === null || params.id === "") {
    const [existing] = await db.select({ n: count() }).from(partnerServices).where(eq(partnerServices.allianceId, params.allianceId));
    if ((existing?.n ?? 0) >= PARTNER_MAX_SERVICES) throw new PartnerValidationError("too_many");
    const commit = await reviewTask(db, params.allianceId, `Review partner services: added ${describe(values)}`, now);
    const [row] = await db
      .insert(partnerServices)
      .values({ allianceId: params.allianceId, ...values, createdAt: now, updatedAt: now })
      .returning();
    await commit();
    return { id: row.id, name: row.name, description: row.description, serviceArea: row.serviceArea, priceFrom: row.priceFrom };
  }

  if (!isUuid(params.id)) throw new PartnerValidationError("invalid");
  const own = and(eq(partnerServices.id, params.id), eq(partnerServices.allianceId, params.allianceId));
  const [before] = await db.select().from(partnerServices).where(own).limit(1);
  if (!before) throw new PartnerValidationError("not_found");
  const commit = await reviewTask(db, params.allianceId, `Review partner services: edited ${describe(before)} → ${describe(values)}`, now);
  const [row] = await db
    .update(partnerServices)
    .set({ ...values, updatedAt: now })
    .where(own)
    .returning();
  await commit();
  return { id: row.id, name: row.name, description: row.description, serviceArea: row.serviceArea, priceFrom: row.priceFrom };
}

// Removes one of the alliance's own services. False if it isn't theirs.
export async function removePartnerService(db: PortalDb, params: { allianceId: string; id: unknown; now?: Date }): Promise<boolean> {
  if (!isUuid(params.id)) return false;
  const now = params.now ?? new Date();
  const own = and(eq(partnerServices.id, params.id), eq(partnerServices.allianceId, params.allianceId));
  const [before] = await db.select().from(partnerServices).where(own).limit(1);
  if (!before) return false;
  const commit = await reviewTask(db, params.allianceId, `Review partner services: removed ${describe(before)}`, now);
  await db.delete(partnerServices).where(own);
  await commit();
  return true;
}

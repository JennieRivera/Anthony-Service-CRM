import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  membershipPlans,
  membershipBenefits,
  membershipPlanBenefits,
  allianceMemberships,
  allianceMembershipStatusHistory,
  allianceMembershipBenefitOverrides,
  invoices,
  strategicAlliances,
  allianceMembershipStatusEnum,
} from "@/lib/db/schema";

// ===================================================================
// Membership Plans

export async function listMembershipPlans() {
  return getDb()
    .select()
    .from(membershipPlans)
    .orderBy(membershipPlans.displayOrder, membershipPlans.name);
}

export async function listActiveMembershipPlansForSelect() {
  return getDb()
    .select({
      id: membershipPlans.id,
      name: membershipPlans.name,
      billingModel: membershipPlans.billingModel,
      price: membershipPlans.price,
      billingFrequency: membershipPlans.billingFrequency,
      currency: membershipPlans.currency,
    })
    .from(membershipPlans)
    .where(eq(membershipPlans.isActive, true))
    .orderBy(membershipPlans.displayOrder, membershipPlans.name);
}

// All plan->benefit pairs in one query, for building a client-side
// planId -> benefitIds[] map (used by the plan editor to pre-check the
// benefits already assigned to a plan) without an N+1 query per plan.
export async function listAllPlanBenefitLinks() {
  return getDb()
    .select({ planId: membershipPlanBenefits.planId, benefitId: membershipPlanBenefits.benefitId })
    .from(membershipPlanBenefits);
}

export async function getMembershipPlanById(id: string) {
  const db = getDb();
  const [plan] = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.id, id))
    .limit(1);
  if (!plan) return null;

  const benefits = await db
    .select({
      id: membershipBenefits.id,
      name: membershipBenefits.name,
      description: membershipBenefits.description,
      category: membershipBenefits.category,
      isActive: membershipBenefits.isActive,
    })
    .from(membershipPlanBenefits)
    .innerJoin(membershipBenefits, eq(membershipPlanBenefits.benefitId, membershipBenefits.id))
    .where(eq(membershipPlanBenefits.planId, id))
    .orderBy(membershipBenefits.name);

  return { plan, benefits };
}

export async function createMembershipPlan(values: {
  name: string;
  description: string | null;
  billingModel: (typeof membershipPlans.$inferSelect)["billingModel"];
  price: string | null;
  billingFrequency: (typeof membershipPlans.$inferSelect)["billingFrequency"];
  currency: string;
  benefitsSummary: string | null;
  displayOrder: number;
  createdByEmail: string | null;
}) {
  const [row] = await getDb().insert(membershipPlans).values(values).returning();
  return row;
}

export async function updateMembershipPlan(
  id: string,
  values: {
    name: string;
    description: string | null;
    billingModel: (typeof membershipPlans.$inferSelect)["billingModel"];
    price: string | null;
    billingFrequency: (typeof membershipPlans.$inferSelect)["billingFrequency"];
    currency: string;
    benefitsSummary: string | null;
    displayOrder: number;
  },
) {
  const [row] = await getDb()
    .update(membershipPlans)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(membershipPlans.id, id))
    .returning();
  return row ?? null;
}

export async function setMembershipPlanActive(id: string, isActive: boolean) {
  const [row] = await getDb()
    .update(membershipPlans)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(membershipPlans.id, id))
    .returning();
  return row ?? null;
}

// Replaces the full benefit set for a plan — simplest safe approach for
// a checkbox-list editor; never duplicates a (planId, benefitId) pair
// (the unique index on membershipPlanBenefits is the real guarantee).
export async function setMembershipPlanBenefits(planId: string, benefitIds: string[]) {
  const db = getDb();
  await db.delete(membershipPlanBenefits).where(eq(membershipPlanBenefits.planId, planId));
  if (benefitIds.length > 0) {
    await db
      .insert(membershipPlanBenefits)
      .values(benefitIds.map((benefitId) => ({ planId, benefitId })));
  }
}

// ===================================================================
// Membership Benefits (reusable catalog)

export async function listMembershipBenefits() {
  return getDb()
    .select()
    .from(membershipBenefits)
    .orderBy(membershipBenefits.category, membershipBenefits.name);
}

export async function listActiveMembershipBenefitsForSelect() {
  return getDb()
    .select({ id: membershipBenefits.id, name: membershipBenefits.name, category: membershipBenefits.category })
    .from(membershipBenefits)
    .where(eq(membershipBenefits.isActive, true))
    .orderBy(membershipBenefits.category, membershipBenefits.name);
}

export async function createMembershipBenefit(values: {
  name: string;
  description: string | null;
  category: string | null;
  internalNotes: string | null;
}) {
  const [row] = await getDb().insert(membershipBenefits).values(values).returning();
  return row;
}

export async function updateMembershipBenefit(
  id: string,
  values: { name: string; description: string | null; category: string | null; internalNotes: string | null },
) {
  const [row] = await getDb()
    .update(membershipBenefits)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(membershipBenefits.id, id))
    .returning();
  return row ?? null;
}

export async function setMembershipBenefitActive(id: string, isActive: boolean) {
  const [row] = await getDb()
    .update(membershipBenefits)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(membershipBenefits.id, id))
    .returning();
  return row ?? null;
}

// ===================================================================
// Alliance Memberships — one row per plan-assignment "episode" (see the
// comment on allianceMemberships in schema.ts). "Current" is simply the
// most recent row for the alliance; older rows are history by construction.

export async function getCurrentMembershipForAlliance(allianceId: string) {
  const [row] = await getDb()
    .select()
    .from(allianceMemberships)
    .where(eq(allianceMemberships.allianceId, allianceId))
    .orderBy(desc(allianceMemberships.createdAt))
    .limit(1);
  return row ?? null;
}

export async function listMembershipHistoryForAlliance(allianceId: string) {
  return getDb()
    .select()
    .from(allianceMemberships)
    .where(eq(allianceMemberships.allianceId, allianceId))
    .orderBy(desc(allianceMemberships.createdAt));
}

export async function listMembershipStatusHistory(membershipId: string) {
  return getDb()
    .select()
    .from(allianceMembershipStatusHistory)
    .where(eq(allianceMembershipStatusHistory.membershipId, membershipId))
    .orderBy(desc(allianceMembershipStatusHistory.changedAt));
}

export async function listBenefitOverrides(membershipId: string) {
  return getDb()
    .select({
      id: allianceMembershipBenefitOverrides.id,
      overrideType: allianceMembershipBenefitOverrides.overrideType,
      note: allianceMembershipBenefitOverrides.note,
      createdAt: allianceMembershipBenefitOverrides.createdAt,
      createdByEmail: allianceMembershipBenefitOverrides.createdByEmail,
      benefitId: membershipBenefits.id,
      benefitName: membershipBenefits.name,
    })
    .from(allianceMembershipBenefitOverrides)
    .innerJoin(membershipBenefits, eq(allianceMembershipBenefitOverrides.benefitId, membershipBenefits.id))
    .where(eq(allianceMembershipBenefitOverrides.membershipId, membershipId))
    .orderBy(desc(allianceMembershipBenefitOverrides.createdAt));
}

// Effective benefits = plan's own benefits + include-overrides -
// exclude-overrides, computed at read time — never mutates the global
// plan to customize one alliance.
export async function getEffectiveBenefitsForMembership(membershipId: string, planId: string) {
  const db = getDb();
  const [planBenefits, overrides] = await Promise.all([
    db
      .select({ id: membershipBenefits.id, name: membershipBenefits.name, category: membershipBenefits.category })
      .from(membershipPlanBenefits)
      .innerJoin(membershipBenefits, eq(membershipPlanBenefits.benefitId, membershipBenefits.id))
      .where(eq(membershipPlanBenefits.planId, planId)),
    listBenefitOverrides(membershipId),
  ]);

  const excluded = new Set(overrides.filter((o) => o.overrideType === "exclude").map((o) => o.benefitId));
  const included = overrides.filter((o) => o.overrideType === "include");

  const effective = planBenefits.filter((b) => !excluded.has(b.id));
  for (const inc of included) {
    if (!effective.some((b) => b.id === inc.benefitId)) {
      effective.push({ id: inc.benefitId, name: inc.benefitName, category: null });
    }
  }
  return effective;
}

export async function getAllianceMembershipData(allianceId: string) {
  const current = await getCurrentMembershipForAlliance(allianceId);
  const history = await listMembershipHistoryForAlliance(allianceId);

  if (!current) {
    return { current: null, history, statusHistory: [], overrides: [], effectiveBenefits: [], invoice: null };
  }

  const [statusHistory, overrides, effectiveBenefits, invoice] = await Promise.all([
    listMembershipStatusHistory(current.id),
    listBenefitOverrides(current.id),
    getEffectiveBenefitsForMembership(current.id, current.planId),
    current.invoiceId
      ? getDb()
          .select({ id: invoices.id, invoiceSeq: invoices.invoiceSeq, status: invoices.status, total: invoices.total })
          .from(invoices)
          .where(eq(invoices.id, current.invoiceId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : null,
  ]);

  return { current, history, statusHistory, overrides, effectiveBenefits, invoice };
}

// First-ever assignment OR a plan change for an alliance that already
// has a membership: when a current episode exists, it is closed
// (status -> "cancelled", noted as superseded) before the new row is
// inserted — never mutated in place, so its planNameSnapshot/
// priceSnapshot/history remain exactly what was true for that episode.
export async function assignAllianceMembership(params: {
  allianceId: string;
  planId: string;
  planNameSnapshot: string;
  feeType: (typeof allianceMemberships.$inferSelect)["feeType"];
  waivedReason: string | null;
  priceSnapshot: string | null;
  billingFrequencySnapshot: (typeof allianceMemberships.$inferSelect)["billingFrequencySnapshot"];
  startDate: string | null;
  renewalDate: string | null;
  notes: string | null;
  createdByEmail: string | null;
}) {
  const db = getDb();
  const existing = await getCurrentMembershipForAlliance(params.allianceId);

  if (existing && existing.status !== "cancelled" && existing.status !== "expired") {
    await db
      .update(allianceMemberships)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(allianceMemberships.id, existing.id));
    await db.insert(allianceMembershipStatusHistory).values({
      membershipId: existing.id,
      previousStatus: existing.status,
      newStatus: "cancelled",
      changedByEmail: params.createdByEmail,
      note: `Superseded by a new plan assignment (${params.planNameSnapshot})`,
    });
  }

  const [row] = await db
    .insert(allianceMemberships)
    .values({
      allianceId: params.allianceId,
      planId: params.planId,
      planNameSnapshot: params.planNameSnapshot,
      status: "pending",
      feeType: params.feeType,
      waivedReason: params.waivedReason,
      priceSnapshot: params.priceSnapshot,
      billingFrequencySnapshot: params.billingFrequencySnapshot,
      startDate: params.startDate,
      renewalDate: params.renewalDate,
      notes: params.notes,
      createdByEmail: params.createdByEmail,
    })
    .returning();

  await db.insert(allianceMembershipStatusHistory).values({
    membershipId: row.id,
    previousStatus: null,
    newStatus: "pending",
    changedByEmail: params.createdByEmail,
  });

  return row;
}

// Updates editable terms on the CURRENT episode without touching status
// or plan — separate explicit actions (changeMembershipStatus,
// assignAllianceMembership) handle those.
export async function updateAllianceMembershipTerms(
  membershipId: string,
  values: {
    feeType: (typeof allianceMemberships.$inferSelect)["feeType"];
    waivedReason: string | null;
    startDate: string | null;
    renewalDate: string | null;
    notes: string | null;
  },
) {
  const [row] = await getDb()
    .update(allianceMemberships)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(allianceMemberships.id, membershipId))
    .returning();
  return row ?? null;
}

const terminalStatuses = new Set(["cancelled", "expired"]);

export async function changeMembershipStatus(
  membershipId: string,
  newStatus: (typeof allianceMembershipStatusEnum.enumValues)[number],
  note: string | null,
  changedByEmail: string | null,
) {
  const db = getDb();
  const [existing] = await db
    .select({ status: allianceMemberships.status })
    .from(allianceMemberships)
    .where(eq(allianceMemberships.id, membershipId))
    .limit(1);
  if (!existing) throw new Error("Membership record not found");
  if (terminalStatuses.has(existing.status)) {
    throw new Error("This membership episode has ended; assign a new membership instead of reactivating it.");
  }

  const [row] = await db
    .update(allianceMemberships)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(allianceMemberships.id, membershipId))
    .returning();

  await db.insert(allianceMembershipStatusHistory).values({
    membershipId,
    previousStatus: existing.status,
    newStatus,
    changedByEmail,
    note,
  });

  return row;
}

export async function linkInvoiceToMembership(membershipId: string, invoiceId: string | null) {
  const [row] = await getDb()
    .update(allianceMemberships)
    .set({ invoiceId, updatedAt: new Date() })
    .where(eq(allianceMemberships.id, membershipId))
    .returning();
  return row ?? null;
}

export async function addBenefitOverride(params: {
  membershipId: string;
  benefitId: string;
  overrideType: (typeof allianceMembershipBenefitOverrides.$inferSelect)["overrideType"];
  note: string | null;
  createdByEmail: string | null;
}) {
  const [row] = await getDb().insert(allianceMembershipBenefitOverrides).values(params).returning();
  return row;
}

export async function removeBenefitOverride(id: string) {
  const [row] = await getDb()
    .delete(allianceMembershipBenefitOverrides)
    .where(eq(allianceMembershipBenefitOverrides.id, id))
    .returning();
  return row ?? null;
}

// Invoices belonging to the alliance's own linked client only — never
// another alliance's or client's invoices (section 27: membership does
// not override privacy).
export async function listInvoicesForClient(clientId: string) {
  return getDb()
    .select({ id: invoices.id, invoiceSeq: invoices.invoiceSeq, status: invoices.status, total: invoices.total })
    .from(invoices)
    .where(eq(invoices.clientId, clientId))
    .orderBy(desc(invoices.createdAt));
}

// Used by cleanup/testing scripts and the plans admin page's delete
// guard — never exposed as a destructive UI action against a plan with
// membership history (plans are deactivated, not deleted, in normal use).
export async function countMembershipsForPlan(planId: string) {
  const rows = await getDb()
    .select({ id: allianceMemberships.id })
    .from(allianceMemberships)
    .where(eq(allianceMemberships.planId, planId));
  return rows.length;
}

export async function getAllianceNameMap(allianceIds: string[]) {
  if (allianceIds.length === 0) return new Map<string, string>();
  const rows = await getDb()
    .select({ id: strategicAlliances.id, organizationName: strategicAlliances.organizationName })
    .from(strategicAlliances)
    .where(inArray(strategicAlliances.id, allianceIds));
  return new Map(rows.map((r) => [r.id, r.organizationName]));
}

// Pure helper (no DB) kept here so both the server action and any future
// script computing a "renewal due soon" view share one definition.
export function isRenewalSoon(renewalDate: string | null, withinDays = 30): boolean {
  if (!renewalDate) return false;
  const diffMs = new Date(renewalDate).getTime() - Date.now();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= withinDays;
}

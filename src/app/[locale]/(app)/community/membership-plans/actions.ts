"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { requireAccessArea } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import {
  membershipPlanFormSchema,
  membershipBenefitFormSchema,
  type MembershipPlanFormValues,
  type MembershipBenefitFormValues,
} from "@/lib/validation/membership";
import {
  createMembershipPlan,
  updateMembershipPlan,
  setMembershipPlanActive,
  setMembershipPlanBenefits,
  createMembershipBenefit,
  updateMembershipBenefit,
  setMembershipBenefitActive,
} from "@/lib/queries/memberships";

// B2B Memberships & Benefits, section 20 — plan/benefit catalog
// administration is "b2b_membership" (full administration), granted to
// community_manager and the admin-tier roles — never implied by
// "alliances" alone, never granted to bookkeeping_staff (billing-only),
// referral_manager, or academy roles. See the AccessArea comment in
// permissions.ts for the full rationale.

function normalizePlan(values: MembershipPlanFormValues) {
  return {
    name: values.name,
    description: values.description || null,
    billingModel: values.billingModel,
    price: values.billingModel === "free" ? null : values.price || null,
    billingFrequency: values.billingFrequency || null,
    currency: values.currency || "USD",
    benefitsSummary: values.benefitsSummary || null,
    displayOrder: values.displayOrder ? Number(values.displayOrder) : 0,
  };
}

export async function createMembershipPlanAction(rawValues: MembershipPlanFormValues) {
  await requireAccessArea("b2b_membership");
  const values = membershipPlanFormSchema.parse(rawValues);
  const session = await auth();

  const plan = await createMembershipPlan({
    ...normalizePlan(values),
    createdByEmail: session?.user?.email ?? null,
  });
  if (values.benefitIds.length > 0) {
    await setMembershipPlanBenefits(plan.id, values.benefitIds);
  }

  await logAuditEvent({
    action: "membership_plan.created",
    entityType: "membership_plan",
    entityId: plan.id,
    summary: `Created membership plan "${values.name}" (${values.billingModel})`,
  });

  revalidatePath("/community/membership-plans");
}

export async function updateMembershipPlanAction(id: string, rawValues: MembershipPlanFormValues) {
  await requireAccessArea("b2b_membership");
  const values = membershipPlanFormSchema.parse(rawValues);

  await updateMembershipPlan(id, normalizePlan(values));
  await setMembershipPlanBenefits(id, values.benefitIds);

  await logAuditEvent({
    action: "membership_plan.updated",
    entityType: "membership_plan",
    entityId: id,
    summary: `Updated membership plan "${values.name}"`,
  });

  revalidatePath("/community/membership-plans");
}

export async function setMembershipPlanActiveAction(id: string, isActive: boolean) {
  await requireAccessArea("b2b_membership");
  await setMembershipPlanActive(id, isActive);

  await logAuditEvent({
    action: "membership_plan.updated",
    entityType: "membership_plan",
    entityId: id,
    summary: `Membership plan ${isActive ? "activated" : "deactivated"}`,
  });

  revalidatePath("/community/membership-plans");
}

export async function createMembershipBenefitAction(rawValues: MembershipBenefitFormValues) {
  await requireAccessArea("b2b_membership");
  const values = membershipBenefitFormSchema.parse(rawValues);

  const benefit = await createMembershipBenefit({
    name: values.name,
    description: values.description || null,
    category: values.category || null,
    internalNotes: values.internalNotes || null,
  });

  await logAuditEvent({
    action: "membership_benefit.created",
    entityType: "membership_benefit",
    entityId: benefit.id,
    summary: `Created membership benefit "${values.name}"`,
  });

  revalidatePath("/community/membership-plans");
}

export async function updateMembershipBenefitAction(id: string, rawValues: MembershipBenefitFormValues) {
  await requireAccessArea("b2b_membership");
  const values = membershipBenefitFormSchema.parse(rawValues);

  await updateMembershipBenefit(id, {
    name: values.name,
    description: values.description || null,
    category: values.category || null,
    internalNotes: values.internalNotes || null,
  });

  await logAuditEvent({
    action: "membership_benefit.updated",
    entityType: "membership_benefit",
    entityId: id,
    summary: `Updated membership benefit "${values.name}"`,
  });

  revalidatePath("/community/membership-plans");
}

export async function setMembershipBenefitActiveAction(id: string, isActive: boolean) {
  await requireAccessArea("b2b_membership");
  await setMembershipBenefitActive(id, isActive);

  await logAuditEvent({
    action: "membership_benefit.updated",
    entityType: "membership_benefit",
    entityId: id,
    summary: `Membership benefit ${isActive ? "activated" : "deactivated"}`,
  });

  revalidatePath("/community/membership-plans");
}

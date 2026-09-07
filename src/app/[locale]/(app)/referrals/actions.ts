"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  referrals,
  referralStatusHistory,
  rriReferralDetails,
  referralStatusEnum,
} from "@/lib/db/schema";
import {
  referralFormSchema,
  type ReferralFormValues,
} from "@/lib/validation/referral";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";

function computeRevenue(values: ReferralFormValues) {
  const gross = Number(values.grossRevenue) || 0;
  const deductions = Number(values.allowedDeductions) || 0;
  const net = Math.max(gross - deductions, 0);
  const percentage = Number(values.commissionPercentage) || 0;
  const commissionDue = net * (percentage / 100);
  return { net, commissionDue };
}

// Every referral's coarse referrals.status is now driven by its general
// pipelineStatus, the same way each Phase 2 case category drives
// cases.status from its own fine-grained status — so this referral shows
// up correctly on any view that only understands the coarse
// submitted/in_progress/closed_won/closed_lost states.
function deriveEffectiveStatus(
  values: ReferralFormValues,
): (typeof referralStatusEnum.enumValues)[number] {
  const s = values.pipelineStatus;
  if (s === "closed_funded" || s === "commission_paid") return "closed_won";
  if (s === "declined" || s === "cancelled") return "closed_lost";
  if (s === "new_referral" || s === "registered") return "submitted";
  return "in_progress";
}

async function recordStatusChange(
  referralId: string,
  previousStatus: (typeof referralStatusEnum.enumValues)[number] | null,
  newStatus: (typeof referralStatusEnum.enumValues)[number],
) {
  const session = await auth();
  await getDb()
    .insert(referralStatusHistory)
    .values({
      referralId,
      previousStatus,
      newStatus,
      changedByEmail: session?.user?.email ?? null,
    });
}

async function upsertRriDetails(referralId: string, values: ReferralFormValues) {
  if (values.category !== "commercial_finance") return;

  const db = getDb();
  const detail = {
    businessName: values.rriBusinessName || null,
    businessEntity: values.businessEntity || null,
    industry: values.industry || null,
    yearsInBusiness: values.yearsInBusiness
      ? Number(values.yearsInBusiness)
      : null,
    fundingPurpose: values.fundingPurpose || null,
    amountRequested: values.amountRequested
      ? Number(values.amountRequested).toFixed(2)
      : null,
    monthlyRevenueRange: values.monthlyRevenueRange || null,
    financingType: values.financingType || null,
    documentsRequested: values.rriDocumentsRequested || null,
    documentsReceived: values.rriDocumentsReceived || null,
    consentToShareInformation: values.consentToShareInformation ?? false,
    // status intentionally not written here anymore — referrals.pipelineStatus
    // is now the single source of truth for every referral (see schema.ts).
  };

  await db
    .insert(rriReferralDetails)
    .values({ referralId, ...detail })
    .onConflictDoUpdate({ target: rriReferralDetails.referralId, set: detail });
}

function normalize(values: ReferralFormValues, effectiveStatus: string) {
  const { net, commissionDue } = computeRevenue(values);
  const hasGross = values.grossRevenue !== undefined && values.grossRevenue !== "";
  const hasPercentage =
    values.commissionPercentage !== undefined &&
    values.commissionPercentage !== "";

  return {
    clientId: values.clientId,
    caseId: values.caseId || null,
    referralDate: values.referralDate,
    category: values.category,
    allianceId: values.allianceId || null,
    direction: values.direction || null,
    originatingBusiness: values.originatingBusiness || null,
    referredBy: values.referredBy,
    receivingParty: values.receivingParty,
    pipelineStatus: values.pipelineStatus,
    status: effectiveStatus as (typeof referralStatusEnum.enumValues)[number],
    closedDate: values.closedDate || null,
    grossRevenue: hasGross ? Number(values.grossRevenue).toFixed(2) : null,
    allowedDeductions: values.allowedDeductions
      ? Number(values.allowedDeductions).toFixed(2)
      : null,
    netServiceRevenue: hasGross ? net.toFixed(2) : null,
    commissionPercentage: hasPercentage
      ? Number(values.commissionPercentage).toFixed(2)
      : null,
    commissionDue: hasGross && hasPercentage ? commissionDue.toFixed(2) : null,
    commissionDueDate: values.commissionDueDate || null,
    commissionPaidDate: values.commissionPaidDate || null,
    paymentMethod: values.paymentMethod || null,
    paymentConfirmation: values.paymentConfirmation || null,
    notes: values.notes || null,
    updatedAt: new Date(),
  };
}

export async function createReferralAction(rawValues: ReferralFormValues) {
  const values = referralFormSchema.parse(rawValues);
  const db = getDb();
  const effectiveStatus = deriveEffectiveStatus(values);

  const [created] = await db
    .insert(referrals)
    .values(normalize(values, effectiveStatus))
    .returning({ id: referrals.id });

  await upsertRriDetails(created.id, values);
  await recordStatusChange(created.id, null, effectiveStatus);

  revalidatePath("/referrals");
  revalidatePath(`/clients/${values.clientId}`);
  const locale = await getLocale();
  redirect({ href: `/referrals/${created.id}`, locale });
}

export async function updateReferralAction(
  id: string,
  rawValues: ReferralFormValues,
) {
  const values = referralFormSchema.parse(rawValues);
  const db = getDb();
  const effectiveStatus = deriveEffectiveStatus(values);

  const [existing] = await db
    .select({ status: referrals.status })
    .from(referrals)
    .where(eq(referrals.id, id))
    .limit(1);

  await db
    .update(referrals)
    .set(normalize(values, effectiveStatus))
    .where(eq(referrals.id, id));

  await upsertRriDetails(id, values);

  if (existing && existing.status !== effectiveStatus) {
    await recordStatusChange(id, existing.status, effectiveStatus);
  }

  revalidatePath("/referrals");
  revalidatePath(`/referrals/${id}`);
  revalidatePath(`/clients/${values.clientId}`);
  const locale = await getLocale();
  redirect({ href: `/referrals/${id}`, locale });
}

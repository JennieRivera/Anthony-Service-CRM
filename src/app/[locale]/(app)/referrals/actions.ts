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

// Commercial Finance/RRI referrals drive the coarse referrals.status from
// their own granular pipeline, the same way each Phase 2 case category
// drives cases.status — so this referral shows up correctly on any view
// that only understands the coarse submitted/in_progress/closed_won/
// closed_lost states.
function deriveEffectiveStatus(
  values: ReferralFormValues,
): (typeof referralStatusEnum.enumValues)[number] {
  if (values.category === "commercial_finance" && values.rriStatus) {
    const s = values.rriStatus;
    if (s === "declined") return "closed_lost";
    if (s === "closed") return "closed_won";
    if (s === "new_referral") return "submitted";
    return "in_progress";
  }
  return values.status;
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
    status: values.rriStatus || "new_referral",
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
    originatingBusiness: values.originatingBusiness || null,
    referredBy: values.referredBy,
    receivingParty: values.receivingParty,
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

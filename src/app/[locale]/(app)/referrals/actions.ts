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
import {
  compensationTermsFormSchema,
  markCompensationEarnedFormSchema,
  approveCompensationFormSchema,
  recordCompensationPaymentFormSchema,
  reverseCompensationPaymentFormSchema,
  type CompensationTermsFormValues,
  type MarkCompensationEarnedFormValues,
  type ApproveCompensationFormValues,
  type RecordCompensationPaymentFormValues,
  type ReverseCompensationPaymentFormValues,
} from "@/lib/validation/referralCompensation";
import {
  upsertCompensationTerms,
  markCompensationEarned,
  approveCompensation,
  recordCompensationPayment,
  reverseCompensationPayment,
  getCompensationForReferral,
} from "@/lib/queries/referralCompensations";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { requireAccessArea } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";

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
    referrerClientId: values.referrerClientId || null,
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
    partnerNote: values.partnerNote || null,
    partnerService: (values.partnerService || null) as typeof referrals.$inferInsert.partnerService,
    updatedAt: new Date(),
  };
}

export async function createReferralAction(rawValues: ReferralFormValues) {
  // Referrals & Commissions Foundation, section 22 — this (and every
  // other referral/compensation action in this file) previously had NO
  // server-side check at all, same gap already closed for Alliances in
  // the B2B Network Foundation phase. "referrals" is the pre-existing
  // Phase 2H area (today only referral_manager + the admin-tier roles).
  await requireAccessArea("referrals");
  const values = referralFormSchema.parse(rawValues);
  const db = getDb();
  const effectiveStatus = deriveEffectiveStatus(values);

  const [created] = await db
    .insert(referrals)
    .values(normalize(values, effectiveStatus))
    .returning({ id: referrals.id });

  await upsertRriDetails(created.id, values);
  await recordStatusChange(created.id, null, effectiveStatus);
  await logAuditEvent({
    action: "referral.created",
    entityType: "referral",
    entityId: created.id,
    summary: `Created referral REF-${String(created.id).slice(0, 8)} (referred by "${values.referredBy}")`,
  });

  revalidatePath("/referrals");
  revalidatePath(`/clients/${values.clientId}`);
  const locale = await getLocale();
  redirect({ href: `/referrals/${created.id}`, locale });
}

export async function updateReferralAction(
  id: string,
  rawValues: ReferralFormValues,
) {
  await requireAccessArea("referrals");
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
  await logAuditEvent({
    action: "referral.updated",
    entityType: "referral",
    entityId: id,
    summary: `Updated referral (referred by "${values.referredBy}")`,
  });

  if (existing && existing.status !== effectiveStatus) {
    await recordStatusChange(id, existing.status, effectiveStatus);
  }

  revalidatePath("/referrals");
  revalidatePath(`/referrals/${id}`);
  revalidatePath(`/clients/${values.clientId}`);
  const locale = await getLocale();
  redirect({ href: `/referrals/${id}`, locale });
}

// ===================================================================
// Referrals & Commissions Foundation — structured compensation actions.
// RBAC correction — terms/earned use "referral_compensation_terms",
// approval uses "referral_compensation_approval" (granted to no narrow
// role), and payment/reversal use "referral_compensation_payment" — see
// the AccessArea comment block in permissions.ts for the full rationale.

export async function setCompensationTermsAction(
  referralId: string,
  rawValues: CompensationTermsFormValues,
) {
  await requireAccessArea("referral_compensation_terms");
  const values = compensationTermsFormSchema.parse(rawValues);
  const session = await auth();

  const { row, created } = await upsertCompensationTerms(
    referralId,
    values,
    session?.user?.email ?? null,
  );

  await logAuditEvent({
    action: created ? "referral.compensation_terms_set" : "referral.compensation_terms_updated",
    entityType: "referral",
    entityId: referralId,
    summary: `${created ? "Set" : "Updated"} compensation terms (${values.compensationType})`,
  });

  revalidatePath(`/referrals/${referralId}`);
  return row;
}

export async function markCompensationEarnedAction(
  referralId: string,
  compensationId: string,
  rawValues: MarkCompensationEarnedFormValues,
) {
  await requireAccessArea("referral_compensation_terms");
  const values = markCompensationEarnedFormSchema.parse(rawValues);
  const session = await auth();

  const existing = await getCompensationForReferral(referralId);
  if (!existing || existing.compensation.id !== compensationId) {
    throw new Error("Compensation record not found");
  }
  if (existing.compensation.status !== "not_earned") {
    throw new Error("This compensation has already been marked earned.");
  }

  await markCompensationEarned(compensationId, values.earnedNotes || null, session?.user?.email ?? null);

  await logAuditEvent({
    action: "referral.compensation_earned",
    entityType: "referral",
    entityId: referralId,
    summary: "Marked referral compensation as Earned",
  });

  revalidatePath(`/referrals/${referralId}`);
}

export async function approveCompensationAction(
  referralId: string,
  compensationId: string,
  rawValues: ApproveCompensationFormValues,
) {
  await requireAccessArea("referral_compensation_approval");
  const values = approveCompensationFormSchema.parse(rawValues);
  const session = await auth();

  const existing = await getCompensationForReferral(referralId);
  if (!existing || existing.compensation.id !== compensationId) {
    throw new Error("Compensation record not found");
  }
  if (existing.compensation.status !== "earned") {
    throw new Error("Compensation must be Earned before it can be approved.");
  }

  await approveCompensation(
    compensationId,
    values.approvedAmount,
    values.approvalNotes || null,
    session?.user?.email ?? null,
  );

  await logAuditEvent({
    action: "referral.compensation_approved",
    entityType: "referral",
    entityId: referralId,
    summary: `Approved referral compensation: $${values.approvedAmount}`,
  });

  revalidatePath(`/referrals/${referralId}`);
}

export async function recordCompensationPaymentAction(
  referralId: string,
  compensationId: string,
  rawValues: RecordCompensationPaymentFormValues,
) {
  await requireAccessArea("referral_compensation_payment");
  const values = recordCompensationPaymentFormSchema.parse(rawValues);
  const session = await auth();

  const existing = await getCompensationForReferral(referralId);
  if (!existing || existing.compensation.id !== compensationId) {
    throw new Error("Compensation record not found");
  }
  if (existing.compensation.status !== "approved" && existing.compensation.status !== "paid") {
    throw new Error("Compensation must be Approved before a payment can be recorded.");
  }

  await recordCompensationPayment(
    compensationId,
    {
      amountPaid: values.amountPaid,
      paymentDate: values.paymentDate,
      paymentMethod: values.paymentMethod || null,
      paymentReference: values.paymentReference || null,
      notes: values.notes || null,
    },
    session?.user?.email ?? null,
  );

  await logAuditEvent({
    action: "referral.compensation_payment_recorded",
    entityType: "referral",
    entityId: referralId,
    summary: `Recorded referral compensation payment: $${values.amountPaid}`,
  });

  revalidatePath(`/referrals/${referralId}`);
}

export async function reverseCompensationPaymentAction(
  referralId: string,
  paymentId: string,
  rawValues: ReverseCompensationPaymentFormValues,
) {
  await requireAccessArea("referral_compensation_payment");
  const values = reverseCompensationPaymentFormSchema.parse(rawValues);
  const session = await auth();

  const reversed = await reverseCompensationPayment(
    paymentId,
    values.reversalReason,
    session?.user?.email ?? null,
  );
  if (!reversed) throw new Error("Payment record not found");

  await logAuditEvent({
    action: "referral.compensation_payment_reversed",
    entityType: "referral",
    entityId: referralId,
    summary: `Reversed a referral compensation payment of $${reversed.amountPaid}: ${values.reversalReason}`,
  });

  revalidatePath(`/referrals/${referralId}`);
}

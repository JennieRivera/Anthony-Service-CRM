"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { referrals } from "@/lib/db/schema";
import {
  referralFormSchema,
  type ReferralFormValues,
} from "@/lib/validation/referral";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

function computeRevenue(values: ReferralFormValues) {
  const gross = Number(values.grossRevenue) || 0;
  const deductions = Number(values.allowedDeductions) || 0;
  const net = Math.max(gross - deductions, 0);
  const percentage = Number(values.commissionPercentage) || 0;
  const commissionDue = net * (percentage / 100);
  return { net, commissionDue };
}

function normalize(values: ReferralFormValues) {
  const { net, commissionDue } = computeRevenue(values);
  const hasGross = values.grossRevenue !== undefined && values.grossRevenue !== "";
  const hasPercentage =
    values.commissionPercentage !== undefined &&
    values.commissionPercentage !== "";

  return {
    clientId: values.clientId,
    caseId: values.caseId || null,
    referralDate: values.referralDate,
    originatingBusiness: values.originatingBusiness || null,
    referredBy: values.referredBy,
    receivingParty: values.receivingParty,
    status: values.status,
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
    commissionPaidDate: values.commissionPaidDate || null,
    paymentMethod: values.paymentMethod || null,
    paymentConfirmation: values.paymentConfirmation || null,
    notes: values.notes || null,
  };
}

export async function createReferralAction(rawValues: ReferralFormValues) {
  const values = referralFormSchema.parse(rawValues);
  const db = getDb();

  const [created] = await db
    .insert(referrals)
    .values(normalize(values))
    .returning({ id: referrals.id });

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

  await db.update(referrals).set(normalize(values)).where(eq(referrals.id, id));

  revalidatePath("/referrals");
  revalidatePath(`/referrals/${id}`);
  revalidatePath(`/clients/${values.clientId}`);
  const locale = await getLocale();
  redirect({ href: `/referrals/${id}`, locale });
}

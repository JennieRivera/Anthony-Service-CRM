import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  referralCompensations,
  referralCompensationPayments,
} from "@/lib/db/schema";
import type { CompensationTermsFormValues } from "@/lib/validation/referralCompensation";

export async function getCompensationForReferral(referralId: string) {
  const db = getDb();
  const [compensation] = await db
    .select()
    .from(referralCompensations)
    .where(eq(referralCompensations.referralId, referralId))
    .limit(1);
  if (!compensation) return null;

  const payments = await db
    .select()
    .from(referralCompensationPayments)
    .where(eq(referralCompensationPayments.referralCompensationId, compensation.id))
    .orderBy(desc(referralCompensationPayments.paymentDate), desc(referralCompensationPayments.createdAt));

  return { compensation, payments };
}

// Spec section 7 — one compensation arrangement per referral; setting
// terms again updates the same row (itself an audited event) rather than
// creating a competing second arrangement. Never touches status/earned/
// approved/paid fields — those only ever change via the dedicated
// earned/approve/payment actions below.
export async function upsertCompensationTerms(
  referralId: string,
  values: CompensationTermsFormValues,
  createdByEmail: string | null,
) {
  const db = getDb();
  // Only persist the amount fields that apply to the selected compensationType
  // (mirrors the form's own conditional field display) so switching type away
  // from "fixed" or "percentage" can't leave a stale dollar figure behind on
  // the record — a correctness issue, not just a display one, for a table
  // the brief treats as the authoritative compensation arrangement.
  const normalized = {
    compensationType: values.compensationType,
    percentageRate: values.compensationType === "percentage" ? values.percentageRate || null : null,
    fixedAmount: values.compensationType === "fixed" ? values.fixedAmount || null : null,
    eligibleBaseAmount:
      values.compensationType === "percentage" || values.compensationType === "custom"
        ? values.eligibleBaseAmount || null
        : null,
    baseDescription:
      values.compensationType === "percentage" || values.compensationType === "custom"
        ? values.baseDescription || null
        : null,
    earningTrigger: values.compensationType !== "none" ? values.earningTrigger || null : null,
    earningTriggerNotes: values.compensationType !== "none" ? values.earningTriggerNotes || null : null,
    partialPaymentRule: values.compensationType !== "none" ? values.partialPaymentRule || null : null,
    agreementDocumentId: values.agreementDocumentId || null,
    notes: values.notes || null,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: referralCompensations.id })
    .from(referralCompensations)
    .where(eq(referralCompensations.referralId, referralId))
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(referralCompensations)
      .set(normalized)
      .where(eq(referralCompensations.id, existing.id))
      .returning();
    return { row, created: false };
  }

  const [row] = await db
    .insert(referralCompensations)
    .values({ referralId, ...normalized, createdByEmail })
    .returning();
  return { row, created: true };
}

export async function markCompensationEarned(
  compensationId: string,
  earnedNotes: string | null,
  earnedByEmail: string | null,
) {
  const [row] = await getDb()
    .update(referralCompensations)
    .set({
      status: "earned",
      earnedAt: new Date(),
      earnedByEmail,
      earnedNotes,
      updatedAt: new Date(),
    })
    .where(eq(referralCompensations.id, compensationId))
    .returning();
  return row ?? null;
}

export async function approveCompensation(
  compensationId: string,
  approvedAmount: string,
  approvalNotes: string | null,
  approvedByEmail: string | null,
) {
  const [row] = await getDb()
    .update(referralCompensations)
    .set({
      status: "approved",
      approvedAmount,
      approvedAt: new Date(),
      approvedByEmail,
      approvalNotes,
      updatedAt: new Date(),
    })
    .where(eq(referralCompensations.id, compensationId))
    .returning();
  return row ?? null;
}

// Spec section 9/12 — sums non-reversed payments against approvedAmount
// to decide whether status should read "paid." This is a derivation from
// human-entered payment records, never a bank-reconciliation claim (spec
// section AB) — see the comment on referralCompensationPayments in
// schema.ts.
async function recomputePaidStatus(compensationId: string) {
  const db = getDb();
  const [compensation] = await db
    .select({ approvedAmount: referralCompensations.approvedAmount, status: referralCompensations.status })
    .from(referralCompensations)
    .where(eq(referralCompensations.id, compensationId))
    .limit(1);
  if (!compensation || compensation.status === "not_earned" || compensation.status === "earned") return;

  const payments = await db
    .select({ amountPaid: referralCompensationPayments.amountPaid })
    .from(referralCompensationPayments)
    .where(
      and(
        eq(referralCompensationPayments.referralCompensationId, compensationId),
        eq(referralCompensationPayments.reversed, false),
      ),
    );
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
  const approved = Number(compensation.approvedAmount ?? 0);

  const nextStatus = approved > 0 && totalPaid >= approved ? "paid" : "approved";
  if (nextStatus !== compensation.status) {
    await db
      .update(referralCompensations)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(referralCompensations.id, compensationId));
  }
}

export async function recordCompensationPayment(
  compensationId: string,
  values: { amountPaid: string; paymentDate: string; paymentMethod: string | null; paymentReference: string | null; notes: string | null },
  recordedByEmail: string | null,
) {
  const [row] = await getDb()
    .insert(referralCompensationPayments)
    .values({
      referralCompensationId: compensationId,
      amountPaid: values.amountPaid,
      paymentDate: values.paymentDate,
      paymentMethod: values.paymentMethod,
      paymentReference: values.paymentReference,
      notes: values.notes,
      recordedByEmail,
    })
    .returning();

  await recomputePaidStatus(compensationId);
  return row;
}

export async function reverseCompensationPayment(
  paymentId: string,
  reversalReason: string,
  reversedByEmail: string | null,
) {
  const [row] = await getDb()
    .update(referralCompensationPayments)
    .set({
      reversed: true,
      reversedAt: new Date(),
      reversedByEmail,
      reversalReason,
    })
    .where(eq(referralCompensationPayments.id, paymentId))
    .returning();
  if (!row) return null;

  await recomputePaidStatus(row.referralCompensationId);
  return row;
}

import { z } from "zod";

export const compensationTypeValues = ["none", "percentage", "fixed", "custom"] as const;

export const compensationEarningTriggerValues = [
  "client_signed",
  "deposit_received",
  "full_payment_received",
  "manual_confirmation",
  "other",
] as const;

export const compensationPartialPaymentRuleValues = [
  "proportional",
  "full_payment_only",
  "manual",
] as const;

export const compensationStatusValues = ["not_earned", "earned", "approved", "paid"] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

// Spec section 7 — these are the terms a referral's compensation snapshot
// preserves historically. Setting/editing them never recalculates a
// different referral's already-approved or paid amounts.
export const compensationTermsFormSchema = z
  .object({
    compensationType: z.enum(compensationTypeValues),
    percentageRate: optionalString,
    fixedAmount: optionalString,
    eligibleBaseAmount: optionalString,
    baseDescription: optionalString,
    earningTrigger: z.enum(compensationEarningTriggerValues).optional().or(z.literal("")),
    earningTriggerNotes: optionalString,
    partialPaymentRule: z.enum(compensationPartialPaymentRuleValues).optional().or(z.literal("")),
    agreementDocumentId: optionalString,
    notes: optionalString,
  })
  .refine(
    (v) => v.compensationType !== "percentage" || Boolean(v.percentageRate),
    { message: "A percentage rate is required for percentage compensation", path: ["percentageRate"] },
  )
  .refine(
    (v) => v.compensationType !== "fixed" || Boolean(v.fixedAmount),
    { message: "A fixed amount is required for fixed-fee compensation", path: ["fixedAmount"] },
  );
export type CompensationTermsFormValues = z.infer<typeof compensationTermsFormSchema>;

export const markCompensationEarnedFormSchema = z.object({
  earnedNotes: optionalString,
});
export type MarkCompensationEarnedFormValues = z.infer<typeof markCompensationEarnedFormSchema>;

export const approveCompensationFormSchema = z.object({
  approvedAmount: z.string().trim().min(1, "An approved amount is required"),
  approvalNotes: optionalString,
});
export type ApproveCompensationFormValues = z.infer<typeof approveCompensationFormSchema>;

export const recordCompensationPaymentFormSchema = z.object({
  amountPaid: z.string().trim().min(1, "An amount is required"),
  paymentDate: z.string().trim().min(1, "A payment date is required"),
  paymentMethod: optionalString,
  paymentReference: optionalString,
  notes: optionalString,
});
export type RecordCompensationPaymentFormValues = z.infer<typeof recordCompensationPaymentFormSchema>;

export const reverseCompensationPaymentFormSchema = z.object({
  reversalReason: z.string().trim().min(1, "A reason is required to reverse a payment"),
});
export type ReverseCompensationPaymentFormValues = z.infer<typeof reverseCompensationPaymentFormSchema>;

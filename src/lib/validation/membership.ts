import { z } from "zod";

export const membershipBillingModelValues = ["free", "paid", "custom"] as const;
export const membershipBillingFrequencyValues = ["monthly", "annual", "one_time", "custom"] as const;
export const allianceMembershipStatusValues = ["pending", "active", "paused", "expired", "cancelled"] as const;
export const membershipFeeTypeValues = ["standard", "complimentary", "waived", "sponsored", "custom"] as const;
export const membershipBenefitOverrideTypeValues = ["include", "exclude"] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const membershipPlanFormSchema = z
  .object({
    name: z.string().trim().min(1, "A plan name is required"),
    description: optionalString,
    billingModel: z.enum(membershipBillingModelValues),
    price: optionalString,
    billingFrequency: z.enum(membershipBillingFrequencyValues).optional().or(z.literal("")),
    currency: z.string().trim().min(1).default("USD"),
    benefitsSummary: optionalString,
    displayOrder: optionalString,
    benefitIds: z.array(z.string()).default([]),
  })
  .refine((v) => v.billingModel !== "paid" || Boolean(v.price), {
    message: "A price is required for a paid plan",
    path: ["price"],
  });
export type MembershipPlanFormValues = z.infer<typeof membershipPlanFormSchema>;

export const membershipBenefitFormSchema = z.object({
  name: z.string().trim().min(1, "A benefit name is required"),
  description: optionalString,
  category: optionalString,
  internalNotes: optionalString,
});
export type MembershipBenefitFormValues = z.infer<typeof membershipBenefitFormSchema>;

export const assignMembershipFormSchema = z
  .object({
    planId: z.string().trim().min(1, "A plan is required"),
    feeType: z.enum(membershipFeeTypeValues),
    waivedReason: optionalString,
    priceOverride: optionalString,
    startDate: optionalString,
    renewalDate: optionalString,
    notes: optionalString,
  })
  .refine((v) => v.feeType !== "waived" && v.feeType !== "complimentary" && v.feeType !== "sponsored" ? true : Boolean(v.waivedReason), {
    message: "A reason is required when the fee is complimentary, waived, or sponsored",
    path: ["waivedReason"],
  });
export type AssignMembershipFormValues = z.infer<typeof assignMembershipFormSchema>;

export const updateMembershipTermsFormSchema = z.object({
  feeType: z.enum(membershipFeeTypeValues),
  waivedReason: optionalString,
  startDate: optionalString,
  renewalDate: optionalString,
  notes: optionalString,
});
export type UpdateMembershipTermsFormValues = z.infer<typeof updateMembershipTermsFormSchema>;

export const changeMembershipStatusFormSchema = z.object({
  status: z.enum(allianceMembershipStatusValues),
  note: optionalString,
});
export type ChangeMembershipStatusFormValues = z.infer<typeof changeMembershipStatusFormSchema>;

export const linkInvoiceFormSchema = z.object({
  invoiceId: optionalString,
});
export type LinkInvoiceFormValues = z.infer<typeof linkInvoiceFormSchema>;

export const benefitOverrideFormSchema = z.object({
  benefitId: z.string().trim().min(1, "A benefit is required"),
  overrideType: z.enum(membershipBenefitOverrideTypeValues),
  note: optionalString,
});
export type BenefitOverrideFormValues = z.infer<typeof benefitOverrideFormSchema>;

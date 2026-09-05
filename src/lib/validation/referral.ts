import { z } from "zod";

export const referralStatusValues = [
  "submitted",
  "in_progress",
  "closed_won",
  "closed_lost",
] as const;

// Phase 2, Session 4 — Commercial Finance / RRI Referrals
export const referralCategoryValues = ["general", "commercial_finance"] as const;

export const rriStatusValues = [
  "new_referral",
  "consent_pending",
  "submitted_to_rri",
  "rri_reviewing",
  "documents_pending",
  "qualified",
  "declined",
  "approved",
  "closing",
  "funded",
  "commission_due",
  "commission_paid",
  "closed",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const referralFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  caseId: z.string().optional().or(z.literal("")),
  referralDate: z.string().min(1, "Referral date is required"),
  category: z.enum(referralCategoryValues),
  originatingBusiness: optionalString,
  referredBy: z.string().trim().min(1, "Referred by is required"),
  receivingParty: z.string().trim().min(1, "Receiving party is required"),
  status: z.enum(referralStatusValues),
  closedDate: optionalString,
  grossRevenue: optionalString,
  allowedDeductions: optionalString,
  commissionPercentage: optionalString,
  commissionDueDate: optionalString,
  commissionPaidDate: optionalString,
  paymentMethod: optionalString,
  paymentConfirmation: optionalString,
  notes: optionalString,
  // Commercial Finance / RRI details (relevant when category is commercial_finance)
  rriBusinessName: optionalString,
  businessEntity: optionalString,
  industry: optionalString,
  yearsInBusiness: optionalString,
  fundingPurpose: optionalString,
  amountRequested: optionalString,
  monthlyRevenueRange: optionalString,
  financingType: optionalString,
  rriDocumentsRequested: optionalString,
  rriDocumentsReceived: optionalString,
  consentToShareInformation: z.boolean().optional(),
  rriStatus: z.enum(rriStatusValues).optional().or(z.literal("")),
});

export type ReferralFormValues = z.infer<typeof referralFormSchema>;

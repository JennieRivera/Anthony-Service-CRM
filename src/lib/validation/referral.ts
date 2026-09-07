import { z } from "zod";

export const referralStatusValues = [
  "submitted",
  "in_progress",
  "closed_won",
  "closed_lost",
] as const;

// Phase 2, Session 4 — Commercial Finance / RRI Referrals
export const referralCategoryValues = ["general", "commercial_finance"] as const;

// Deprecated: kept only so historical rri_referral_details rows still
// type-check. New code uses referralPipelineStatusValues below, which
// applies to every referral (not just Commercial Finance/RRI ones).
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

// Which way the introduction flowed — set by staff per referral, never
// inferred/guessed for historical rows.
export const referralDirectionValues = [
  "ams_to_rri",
  "rri_to_ams",
  "ams_to_other_partner",
  "other_partner_to_ams",
  "b2b",
  "community",
  "strategic_alliance",
] as const;

// The one general referral pipeline (generalized from what used to be
// RRI-only rriStatusValues above) — applies to every referral regardless
// of category.
export const referralPipelineStatusValues = [
  "new_referral",
  "registered",
  "consent_pending",
  "sent_to_partner",
  "under_review",
  "documents_pending",
  "qualified",
  "service_in_progress",
  "closed_funded",
  "commission_due",
  "commission_paid",
  "declined",
  "cancelled",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const referralFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  caseId: z.string().optional().or(z.literal("")),
  referralDate: z.string().min(1, "Referral date is required"),
  category: z.enum(referralCategoryValues),
  allianceId: optionalString,
  direction: z.enum(referralDirectionValues).optional().or(z.literal("")),
  originatingBusiness: optionalString,
  referredBy: z.string().trim().min(1, "Referred by is required"),
  receivingParty: z.string().trim().min(1, "Receiving party is required"),
  pipelineStatus: z.enum(referralPipelineStatusValues),
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

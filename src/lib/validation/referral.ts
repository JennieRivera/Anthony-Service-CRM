import { z } from "zod";

export const referralStatusValues = [
  "submitted",
  "in_progress",
  "closed_won",
  "closed_lost",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const referralFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  caseId: z.string().optional().or(z.literal("")),
  referralDate: z.string().min(1, "Referral date is required"),
  originatingBusiness: optionalString,
  referredBy: z.string().trim().min(1, "Referred by is required"),
  receivingParty: z.string().trim().min(1, "Receiving party is required"),
  status: z.enum(referralStatusValues),
  closedDate: optionalString,
  grossRevenue: optionalString,
  allowedDeductions: optionalString,
  commissionPercentage: optionalString,
  commissionPaidDate: optionalString,
  paymentMethod: optionalString,
  paymentConfirmation: optionalString,
  notes: optionalString,
});

export type ReferralFormValues = z.infer<typeof referralFormSchema>;

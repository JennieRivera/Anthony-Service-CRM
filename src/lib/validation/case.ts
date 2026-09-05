import { z } from "zod";
import { serviceTypeValues } from "./client";
import { paymentStatusValues } from "./payment";

export const caseStatusValues = [
  "new",
  "in_progress",
  "waiting_on_client",
  "completed",
  "cancelled",
] as const;

export const notarialActTypeValues = [
  "jurat",
  "acknowledgment",
  "oath_affirmation",
  "signature_witnessing",
  "copy_certification",
  "other",
] as const;

export const idVerificationMethodValues = [
  "personal_knowledge",
  "id_card",
  "credible_witness",
] as const;

// Phase 2, Session 1
export const notaryModalityValues = ["in_person", "mobile", "ron", "ipen"] as const;
export const idVerificationStatusValues = [
  "pending",
  "verified",
  "failed",
] as const;
export const notaryCaseStatusValues = [
  "new_request",
  "contacted",
  "appointment_scheduled",
  "waiting_for_documents",
  "ready_for_signing",
  "completed",
  "scanbacks_pending",
  "shipping_pending",
  "closed",
  "cancelled",
] as const;

export const taxFilerTypeValues = ["individual", "business"] as const;
export const taxJurisdictionValues = ["federal", "state"] as const;
export const taxFilingStatusValues = [
  "single",
  "married_filing_jointly",
  "married_filing_separately",
  "head_of_household",
  "qualifying_widow",
] as const;
export const taxCaseStatusValues = [
  "new_client",
  "intake_pending",
  "documents_pending",
  "ready_for_preparation",
  "in_preparation",
  "internal_review",
  "client_review",
  "signature_pending",
  "ready_to_efile",
  "filed",
  "accepted",
  "rejected_correction_needed",
  "completed",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const caseFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  serviceType: z.enum(serviceTypeValues),
  status: z.enum(caseStatusValues),
  title: z.string().trim().min(1, "Title is required"),
  dueDate: optionalString,
  fee: optionalString,
  notes: optionalString,
  // Phase 2 foundation fields (Session 0)
  startDate: z.string().min(1, "Start date is required"),
  nextFollowUpDate: optionalString,
  documentsRequested: optionalString,
  documentsReceived: optionalString,
  paymentStatus: z.enum(paymentStatusValues).optional().or(z.literal("")),
  referralSource: optionalString,
  nextAction: optionalString,
  // Notary journal (only relevant when serviceType is Online Notary)
  notaryDocumentType: optionalString,
  notarialActType: z.enum(notarialActTypeValues).optional(),
  idVerificationMethod: z.enum(idVerificationMethodValues).optional(),
  notaryFeeCharged: optionalString,
  // Apostille / authentication details (optional add-on for Document Prep cases)
  destinationCountry: optionalString,
  instrumentType: optionalString,
  submissionDate: optionalString,
  expectedReturnDate: optionalString,
  actualReturnDate: optionalString,
  // Notary service details (relevant when serviceType is Notary)
  notaryModality: z.enum(notaryModalityValues).optional().or(z.literal("")),
  appointmentDate: optionalString,
  appointmentTime: optionalString,
  location: optionalString,
  numberOfSigners: optionalString,
  numberOfDocuments: optionalString,
  numberOfNotarialActs: optionalString,
  idVerificationStatus: z
    .enum(idVerificationStatusValues)
    .optional()
    .or(z.literal("")),
  witnessRequired: z.boolean().optional(),
  witnessProvidedBy: optionalString,
  loanSigningCompany: optionalString,
  titleCompany: optionalString,
  signingService: optionalString,
  scanbacksRequired: z.boolean().optional(),
  shippingRequired: z.boolean().optional(),
  trackingNumber: optionalString,
  notaryServiceFee: optionalString,
  travelFee: optionalString,
  printingFee: optionalString,
  notaryCaseStatus: z.enum(notaryCaseStatusValues).optional().or(z.literal("")),
  // Tax service details (relevant when serviceType is Tax Prep)
  taxYear: optionalString,
  filerType: z.enum(taxFilerTypeValues).optional().or(z.literal("")),
  jurisdiction: z.enum(taxJurisdictionValues).optional().or(z.literal("")),
  returnType: optionalString,
  filingStatus: z.enum(taxFilingStatusValues).optional().or(z.literal("")),
  businessEntityType: optionalString,
  intakeCompleted: z.boolean().optional(),
  efileAuthorizationSigned: z.boolean().optional(),
  refundAmount: optionalString,
  balanceDueAmount: optionalString,
  taxAmountPaid: optionalString,
  internalNotes: optionalString,
  taxCaseStatus: z.enum(taxCaseStatusValues).optional().or(z.literal("")),
});

export type CaseFormValues = z.infer<typeof caseFormSchema>;

export const notaryServiceTypes = ["online_notary", "notary"];
export const taxServiceTypes = ["tax_prep"];

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

// Phase 2, Session 2
export const bookkeepingFrequencyValues = [
  "monthly",
  "quarterly",
  "cleanup",
  "catch_up",
] as const;
export const deliverableStatusValues = [
  "not_started",
  "in_progress",
  "ready",
  "delivered",
] as const;
export const bookkeepingCaseStatusValues = [
  "lead",
  "assessment",
  "proposal_sent",
  "onboarding",
  "access_pending",
  "documents_pending",
  "bookkeeping_in_progress",
  "reconciliation",
  "internal_review",
  "reports_ready",
  "client_review",
  "active_monthly",
  "paused",
  "closed",
] as const;

export const immigrationCaseStatusValues = [
  "new_inquiry",
  "administrative_intake",
  "client_instructions_pending",
  "documents_pending",
  "administrative_preparation",
  "client_review",
  "signature_pending",
  "ready_for_client_filing",
  "attorney_referral",
  "completed",
  "cancelled",
] as const;

// Phase 2, Session 3
export const creditAccountTypeValues = ["personal", "business"] as const;
export const creditCaseStatusValues = [
  "new_inquiry",
  "consultation_scheduled",
  "assessment",
  "education",
  "action_plan",
  "follow_up",
  "monitoring",
  "completed",
  "cancelled",
] as const;

export const consultingCaseStatusValues = [
  "lead",
  "discovery_call",
  "diagnosis",
  "proposal",
  "agreement_signed",
  "implementation",
  "review",
  "active_consulting",
  "final_review",
  "completed",
] as const;

// Phase 2, Session 4
export const formationTypeValues = [
  "llc",
  "corporation",
  "nonprofit",
  "other",
] as const;
export const formationCaseStatusValues = [
  "new_inquiry",
  "intake",
  "name_review",
  "documents_pending",
  "ready_to_file",
  "filed",
  "state_pending",
  "approved",
  "ein_stage",
  "documents_delivered",
  "completed",
] as const;

// Phase 2, Session 5
export const academyCaseStatusValues = [
  "lead",
  "registered",
  "payment_pending",
  "enrolled",
  "active_student",
  "in_progress",
  "completed",
  "certificate_pending",
  "certified",
  "inactive",
] as const;
export const highlevelSyncStatusValues = [
  "not_synced",
  "synced",
  "error",
] as const;

// Phase 2, Session 6
export const projectTypeValues = [
  "marketing",
  "branding",
  "crm",
  "automation",
  "ai",
] as const;
export const marketingCaseStatusValues = [
  "discovery",
  "audit",
  "strategy",
  "proposal",
  "approved",
  "build",
  "testing",
  "client_review",
  "live",
  "optimization",
  "completed",
] as const;

// Phase 5, Session 4
export const salesTaxCaseStatusValues = [
  "not_started",
  "research_required",
  "registration_pending",
  "submitted",
  "approved",
  "account_active",
  "filing_due",
  "filed",
  "past_due",
  "closed",
] as const;
export const salesTaxFilingFrequencyValues = [
  "monthly",
  "quarterly",
  "annual",
  "other",
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
  // Bookkeeping service details (relevant when serviceType is Bookkeeping)
  businessName: optionalString,
  entityType: optionalString,
  industry: optionalString,
  bookkeepingFrequency: z
    .enum(bookkeepingFrequencyValues)
    .optional()
    .or(z.literal("")),
  accountingSoftware: optionalString,
  numberOfBankAccounts: optionalString,
  numberOfCreditCardAccounts: optionalString,
  payrollUsed: z.boolean().optional(),
  monthlyRevenueRange: optionalString,
  lastMonthReconciled: optionalString,
  cleanupRequired: z.boolean().optional(),
  catchUpStartMonth: optionalString,
  catchUpEndMonth: optionalString,
  nextBillingDate: optionalString,
  reportsRequired: optionalString,
  profitLossStatus: z.enum(deliverableStatusValues).optional().or(z.literal("")),
  balanceSheetStatus: z
    .enum(deliverableStatusValues)
    .optional()
    .or(z.literal("")),
  bookkeepingCaseStatus: z
    .enum(bookkeepingCaseStatusValues)
    .optional()
    .or(z.literal("")),
  // Immigration administrative details (relevant when serviceType is Immigration)
  administrativeServiceType: optionalString,
  formNumber: optionalString,
  clientRequestedForm: z.boolean().optional(),
  clientProvidedInstructions: optionalString,
  language: optionalString,
  translationNeeded: z.boolean().optional(),
  translationStatus: z
    .enum(deliverableStatusValues)
    .optional()
    .or(z.literal("")),
  attorneyReferralNeeded: z.boolean().optional(),
  attorneyReferralDate: optionalString,
  governmentFilingFee: optionalString,
  immigrationCaseStatus: z
    .enum(immigrationCaseStatusValues)
    .optional()
    .or(z.literal("")),
  // Credit service details (relevant when serviceType is Credit Financing)
  creditServiceType: optionalString,
  accountType: z.enum(creditAccountTypeValues).optional().or(z.literal("")),
  initialConsultationDate: optionalString,
  creditEducationCompleted: z.boolean().optional(),
  creditReportReviewDate: optionalString,
  mainClientGoal: optionalString,
  creditCaseStatus: z
    .enum(creditCaseStatusValues)
    .optional()
    .or(z.literal("")),
  // Business consulting details (relevant when serviceType is Leadership)
  businessProblem: optionalString,
  businessStage: optionalString,
  diagnosisSummary: optionalString,
  primaryGoal: optionalString,
  recommendedStrategy: optionalString,
  consultingPackage: optionalString,
  numberOfSessions: optionalString,
  sessionsCompleted: optionalString,
  milestones: optionalString,
  actionPlan: optionalString,
  goal30Day: optionalString,
  goal90Day: optionalString,
  completionPercentage: optionalString,
  consultingCaseStatus: z
    .enum(consultingCaseStatusValues)
    .optional()
    .or(z.literal("")),
  // Business formation details (relevant when serviceType is Company Registration)
  formationType: z.enum(formationTypeValues).optional().or(z.literal("")),
  stateOfFormation: optionalString,
  formationBusinessName: optionalString,
  nameAvailabilityChecked: z.boolean().optional(),
  registeredAgent: optionalString,
  einAssistance: z.boolean().optional(),
  stateFilingDate: optionalString,
  stateApprovalDate: optionalString,
  documentDeliveryStatus: z
    .enum(deliverableStatusValues)
    .optional()
    .or(z.literal("")),
  governmentFee: optionalString,
  formationCaseStatus: z
    .enum(formationCaseStatusValues)
    .optional()
    .or(z.literal("")),
  // Academy enrollment details (relevant when serviceType is Academy)
  program: optionalString,
  course: optionalString,
  enrollmentDate: optionalString,
  modulesCompleted: optionalString,
  progressPercentage: optionalString,
  attendancePercentage: optionalString,
  assignmentsCompleted: optionalString,
  finalEvaluation: optionalString,
  certificateDate: optionalString,
  communityAccess: z.boolean().optional(),
  highlevelSyncStatus: z
    .enum(highlevelSyncStatusValues)
    .optional()
    .or(z.literal("")),
  academyCaseStatus: z
    .enum(academyCaseStatusValues)
    .optional()
    .or(z.literal("")),
  // Marketing/Branding/AI/Automation details (relevant when serviceType is Marketing)
  projectType: z.enum(projectTypeValues).optional().or(z.literal("")),
  businessGoal: optionalString,
  currentSystems: optionalString,
  deliverables: optionalString,
  integrationsRequired: optionalString,
  aiAgentRequired: z.boolean().optional(),
  marketingCompletionPercentage: optionalString,
  marketingCaseStatus: z
    .enum(marketingCaseStatusValues)
    .optional()
    .or(z.literal("")),
  // Sales tax registration details (relevant when serviceType is Sales Tax)
  companyId: optionalString,
  salesTaxState: optionalString,
  stateTaxAgency: optionalString,
  agencyWebsite: optionalString,
  registrationPortalUrl: optionalString,
  salesTaxAccountNumber: optionalString,
  registrationDate: optionalString,
  effectiveDate: optionalString,
  filingFrequency: z
    .enum(salesTaxFilingFrequencyValues)
    .optional()
    .or(z.literal("")),
  nextFilingDueDate: optionalString,
  lastFiledPeriod: optionalString,
  lastFilingDate: optionalString,
  amountDue: optionalString,
  salesTaxAmountPaid: optionalString,
  salesTaxPaymentDate: optionalString,
  accountStatus: optionalString,
  salesTaxCaseStatus: z
    .enum(salesTaxCaseStatusValues)
    .optional()
    .or(z.literal("")),
});

export type CaseFormValues = z.infer<typeof caseFormSchema>;

export const notaryServiceTypes = ["online_notary", "notary"];
export const taxServiceTypes = ["tax_prep"];
export const bookkeepingServiceTypes = ["bookkeeping"];
export const immigrationServiceTypes = ["immigration"];
export const creditServiceTypes = ["credit_financing"];
export const consultingServiceTypes = ["leadership"];
export const formationServiceTypes = ["company_registration"];
export const academyServiceTypes = ["academy"];
export const marketingServiceTypes = ["marketing"];
export const salesTaxServiceTypes = ["sales_tax"];

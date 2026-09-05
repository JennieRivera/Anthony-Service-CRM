import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  integer,
  serial,
  date,
  time,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

export const serviceTypeEnum = pgEnum("service_type", [
  "online_notary",
  "document_prep",
  "tax_prep",
  "company_registration",
  "credit_financing",
  "leadership",
  // Phase 2, Session 1 — broad Notary/RON/IPEN/Loan Signing category.
  // `online_notary` is kept as-is for existing rows; new notary cases of
  // any modality (in person, mobile, RON, IPEN) use this value instead.
  "notary",
  // Phase 2, Session 2
  "bookkeeping",
  // Kept separate from `document_prep` (which today mixes apostille and
  // general document-prep work on 9 real cases) so existing rows aren't
  // reinterpreted; new immigration administrative cases use this instead.
  "immigration",
]);

export const clientStatusEnum = pgEnum("client_status", [
  "lead",
  "active",
  "in_progress",
  "completed",
  "follow_up",
]);

export const caseStatusEnum = pgEnum("case_status", [
  "new",
  "in_progress",
  "waiting_on_client",
  "completed",
  "cancelled",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "unpaid",
  "paid",
  "overdue",
  "cancelled",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "received",
  "submitted",
  "returned",
]);

export const notarialActTypeEnum = pgEnum("notarial_act_type", [
  "jurat",
  "acknowledgment",
  "oath_affirmation",
  "signature_witnessing",
  "copy_certification",
  "other",
]);

export const idVerificationMethodEnum = pgEnum("id_verification_method", [
  "personal_knowledge",
  "id_card",
  "credible_witness",
]);

export const conversationChannelEnum = pgEnum("conversation_channel", [
  "email",
  "call",
  "whatsapp",
]);

export const conversationDirectionEnum = pgEnum("conversation_direction", [
  "inbound",
  "outbound",
]);

export const referralStatusEnum = pgEnum("referral_status", [
  "submitted",
  "in_progress",
  "closed_won",
  "closed_lost",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "partial",
  "paid",
  "overdue",
  "refunded",
  "cancelled",
]);

export const refundStatusEnum = pgEnum("refund_status", [
  "none",
  "partial",
  "full",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  preferredLanguage: text("preferred_language", { enum: ["en", "es"] })
    .notNull()
    .default("en"),
  status: clientStatusEnum("status").notNull().default("lead"),
  referralSource: text("referral_source"),
  interestedServices: serviceTypeEnum("interested_services").array(),
  notes: text("notes"),
});

export const cases = pgTable("cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  serviceType: serviceTypeEnum("service_type").notNull(),
  status: caseStatusEnum("status").notNull().default("new"),
  title: text("title").notNull(),
  dueDate: date("due_date"),
  fee: numeric("fee", { precision: 12, scale: 2 }),
  notes: text("notes"),
  // Phase 2 foundation fields (Session 0) — reserved for the role/staff
  // system landing in a later session, same "declared but not yet wired
  // into any UI" pattern already used by documents.uploadedBy.
  assignedUserId: uuid("assigned_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  startDate: date("start_date").notNull().defaultNow(),
  nextFollowUpDate: date("next_follow_up_date"),
  documentsRequested: text("documents_requested"),
  documentsReceived: text("documents_received"),
  paymentStatus: paymentStatusEnum("payment_status"),
  referralSource: text("referral_source"),
  nextAction: text("next_action"),
  closedDate: date("closed_date"),
});

export const caseStatusHistory = pgTable("case_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  previousStatus: caseStatusEnum("previous_status"),
  newStatus: caseStatusEnum("new_status").notNull(),
  // Snapshot of the acting session's email — there's no populated staff/user
  // table yet (single ADMIN_EMAIL auth), so this can't be a real FK today.
  changedByEmail: text("changed_by_email"),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  note: text("note"),
});

export const taskTypeEnum = pgEnum("task_type", [
  "follow_up",
  "payment_check",
  "document_reminder",
  "closing",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "open",
  "done",
  "dismissed",
]);

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  type: taskTypeEnum("type").notNull(),
  title: text("title").notNull(),
  dueDate: date("due_date"),
  status: taskStatusEnum("status").notNull().default("open"),
  assignedUserId: uuid("assigned_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  fileName: text("file_name").notNull(),
  blobUrl: text("blob_url").notNull(),
  documentType: text("document_type"),
  status: documentStatusEnum("status"),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  serviceType: serviceTypeEnum("service_type").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  location: text("location"),
  status: appointmentStatusEnum("status").notNull().default("scheduled"),
  notes: text("notes"),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  invoiceSeq: serial("invoice_seq").notNull().unique(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  status: invoiceStatusEnum("status").notNull().default("unpaid"),
  issueDate: date("issue_date").notNull().defaultNow(),
  dueDate: date("due_date"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  notes: text("notes"),
});

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 })
    .notNull()
    .default("1"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const notaryLogEntries = pgTable("notary_log_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  entryDate: date("entry_date").notNull(),
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  clientNameSnapshot: text("client_name_snapshot").notNull(),
  documentType: text("document_type").notNull(),
  notarialActType: notarialActTypeEnum("notarial_act_type").notNull(),
  idVerificationMethod: idVerificationMethodEnum(
    "id_verification_method",
  ).notNull(),
  feeCharged: numeric("fee_charged", { precision: 12, scale: 2 }),
  notes: text("notes"),
});

export const apostilleDetails = pgTable("apostille_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  destinationCountry: text("destination_country").notNull(),
  instrumentType: text("instrument_type").notNull(),
  submissionDate: date("submission_date"),
  expectedReturnDate: date("expected_return_date"),
  actualReturnDate: date("actual_return_date"),
  notes: text("notes"),
});

// Phase 2, Session 1 — Notary / RON / IPEN / Loan Signing category.
// This is the case-level appointment/intake tracker; the existing
// notary_log_entries table remains the separate, immutable Florida
// notarial-journal record for each individual notarial act performed.
export const notaryModalityEnum = pgEnum("notary_modality", [
  "in_person",
  "mobile",
  "ron",
  "ipen",
]);

export const idVerificationStatusEnum = pgEnum("id_verification_status", [
  "pending",
  "verified",
  "failed",
]);

export const notaryCaseStatusEnum = pgEnum("notary_case_status", [
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
]);

export const notaryServiceDetails = pgTable("notary_service_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  modality: notaryModalityEnum("modality").notNull(),
  appointmentDate: date("appointment_date"),
  appointmentTime: time("appointment_time"),
  location: text("location"),
  numberOfSigners: integer("number_of_signers"),
  numberOfDocuments: integer("number_of_documents"),
  numberOfNotarialActs: integer("number_of_notarial_acts"),
  idVerificationStatus: idVerificationStatusEnum("id_verification_status"),
  witnessRequired: boolean("witness_required").notNull().default(false),
  witnessProvidedBy: text("witness_provided_by"),
  documentType: text("document_type"),
  loanSigningCompany: text("loan_signing_company"),
  titleCompany: text("title_company"),
  signingService: text("signing_service"),
  scanbacksRequired: boolean("scanbacks_required").notNull().default(false),
  shippingRequired: boolean("shipping_required").notNull().default(false),
  trackingNumber: text("tracking_number"),
  notaryFee: numeric("notary_fee", { precision: 12, scale: 2 }),
  travelFee: numeric("travel_fee", { precision: 12, scale: 2 }),
  printingFee: numeric("printing_fee", { precision: 12, scale: 2 }),
  status: notaryCaseStatusEnum("status").notNull().default("new_request"),
});

// Phase 2, Session 1 — Tax Services category.
// One row = one return being prepared for one jurisdiction. A client who
// needs both a federal and a state return gets two linked cases.
export const taxFilerTypeEnum = pgEnum("tax_filer_type", [
  "individual",
  "business",
]);

export const taxJurisdictionEnum = pgEnum("tax_jurisdiction", [
  "federal",
  "state",
]);

export const taxFilingStatusEnum = pgEnum("tax_filing_status", [
  "single",
  "married_filing_jointly",
  "married_filing_separately",
  "head_of_household",
  "qualifying_widow",
]);

export const taxCaseStatusEnum = pgEnum("tax_case_status", [
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
]);

export const taxServiceDetails = pgTable("tax_service_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  taxYear: integer("tax_year").notNull(),
  filerType: taxFilerTypeEnum("filer_type").notNull(),
  jurisdiction: taxJurisdictionEnum("jurisdiction").notNull().default("federal"),
  returnType: text("return_type"),
  filingStatus: taxFilingStatusEnum("filing_status"),
  businessEntityType: text("business_entity_type"),
  intakeCompleted: boolean("intake_completed").notNull().default(false),
  efileAuthorizationSigned: boolean("efile_authorization_signed")
    .notNull()
    .default(false),
  refundAmount: numeric("refund_amount", { precision: 12, scale: 2 }),
  balanceDueAmount: numeric("balance_due_amount", { precision: 12, scale: 2 }),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  internalNotes: text("internal_notes"),
  status: taxCaseStatusEnum("status").notNull().default("new_client"),
});

// Phase 2, Session 2 — Bookkeeping / Accounting Support category.
export const bookkeepingFrequencyEnum = pgEnum("bookkeeping_frequency", [
  "monthly",
  "quarterly",
  "cleanup",
  "catch_up",
]);

// Shared by any per-deliverable tracker (bookkeeping reports, translations,
// etc.) that needs its own progress independent of the case's main pipeline.
export const deliverableStatusEnum = pgEnum("deliverable_status", [
  "not_started",
  "in_progress",
  "ready",
  "delivered",
]);

export const bookkeepingCaseStatusEnum = pgEnum("bookkeeping_case_status", [
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
]);

export const bookkeepingServiceDetails = pgTable("bookkeeping_service_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  businessName: text("business_name"),
  entityType: text("entity_type"),
  industry: text("industry"),
  frequency: bookkeepingFrequencyEnum("frequency"),
  accountingSoftware: text("accounting_software"),
  numberOfBankAccounts: integer("number_of_bank_accounts"),
  numberOfCreditCardAccounts: integer("number_of_credit_card_accounts"),
  payrollUsed: boolean("payroll_used").notNull().default(false),
  monthlyRevenueRange: text("monthly_revenue_range"),
  lastMonthReconciled: date("last_month_reconciled"),
  cleanupRequired: boolean("cleanup_required").notNull().default(false),
  catchUpStartMonth: date("catch_up_start_month"),
  catchUpEndMonth: date("catch_up_end_month"),
  nextBillingDate: date("next_billing_date"),
  reportsRequired: text("reports_required"),
  profitLossStatus: deliverableStatusEnum("profit_loss_status"),
  balanceSheetStatus: deliverableStatusEnum("balance_sheet_status"),
  status: bookkeepingCaseStatusEnum("status").notNull().default("lead"),
});

// Phase 2, Session 2 — Immigration Administrative Services category.
// Always shown with a permanent "not a law firm" disclaimer in the UI.
export const immigrationCaseStatusEnum = pgEnum("immigration_case_status", [
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
]);

export const immigrationServiceDetails = pgTable("immigration_service_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  administrativeServiceType: text("administrative_service_type"),
  formNumber: text("form_number"),
  clientRequestedForm: boolean("client_requested_form").notNull().default(false),
  clientProvidedInstructions: text("client_provided_instructions"),
  language: text("language"),
  translationNeeded: boolean("translation_needed").notNull().default(false),
  translationStatus: deliverableStatusEnum("translation_status"),
  attorneyReferralNeeded: boolean("attorney_referral_needed")
    .notNull()
    .default(false),
  attorneyReferralDate: date("attorney_referral_date"),
  governmentFilingFee: numeric("government_filing_fee", {
    precision: 12,
    scale: 2,
  }),
  status: immigrationCaseStatusEnum("status").notNull().default("new_inquiry"),
});

// Phase 2, Session 3 — Credit Services category.
// Reuses the existing `credit_financing` service_type (its only 2 rows are
// seed data — one credit-repair, one loan-application — confirming the
// category split already anticipated for Commercial Finance/RRI later).
// Always shown with a permanent "no outcome guaranteed" disclaimer.
export const creditAccountTypeEnum = pgEnum("credit_account_type", [
  "personal",
  "business",
]);

export const creditCaseStatusEnum = pgEnum("credit_case_status", [
  "new_inquiry",
  "consultation_scheduled",
  "assessment",
  "education",
  "action_plan",
  "follow_up",
  "monitoring",
  "completed",
  "cancelled",
]);

export const creditServiceDetails = pgTable("credit_service_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  creditServiceType: text("credit_service_type"),
  accountType: creditAccountTypeEnum("account_type"),
  initialConsultationDate: date("initial_consultation_date"),
  creditEducationCompleted: boolean("credit_education_completed")
    .notNull()
    .default(false),
  creditReportReviewDate: date("credit_report_review_date"),
  mainClientGoal: text("main_client_goal"),
  status: creditCaseStatusEnum("status").notNull().default("new_inquiry"),
});

// Phase 2, Session 3 — Business Consulting category.
// Reuses the existing `leadership` service_type (0 existing rows; its
// current template already describes "leadership coaching, training, or
// consulting engagement", a close match with no data-migration risk).
export const consultingCaseStatusEnum = pgEnum("consulting_case_status", [
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
]);

export const consultingServiceDetails = pgTable("consulting_service_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  businessProblem: text("business_problem"),
  businessStage: text("business_stage"),
  diagnosisSummary: text("diagnosis_summary"),
  primaryGoal: text("primary_goal"),
  recommendedStrategy: text("recommended_strategy"),
  consultingPackage: text("consulting_package"),
  numberOfSessions: integer("number_of_sessions"),
  sessionsCompleted: integer("sessions_completed"),
  milestones: text("milestones"),
  actionPlan: text("action_plan"),
  goal30Day: text("goal_30_day"),
  goal90Day: text("goal_90_day"),
  completionPercentage: integer("completion_percentage"),
  status: consultingCaseStatusEnum("status").notNull().default("lead"),
});

export const conversationMessages = pgTable("conversation_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  channel: conversationChannelEnum("channel").notNull(),
  direction: conversationDirectionEnum("direction").notNull(),
  subject: text("subject"),
  summary: text("summary").notNull(),
  durationMinutes: integer("duration_minutes"),
  counterpart: text("counterpart"),
  externalId: text("external_id"),
  loggedBy: uuid("logged_by").references(() => users.id),
});

export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  referralSeq: serial("referral_seq").notNull().unique(),
  referralDate: date("referral_date").notNull().defaultNow(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  originatingBusiness: text("originating_business"),
  referredBy: text("referred_by").notNull(),
  receivingParty: text("receiving_party").notNull(),
  status: referralStatusEnum("status").notNull().default("submitted"),
  closedDate: date("closed_date"),
  grossRevenue: numeric("gross_revenue", { precision: 12, scale: 2 }),
  allowedDeductions: numeric("allowed_deductions", { precision: 12, scale: 2 }),
  netServiceRevenue: numeric("net_service_revenue", {
    precision: 12,
    scale: 2,
  }),
  commissionPercentage: numeric("commission_percentage", {
    precision: 5,
    scale: 2,
  }),
  commissionDue: numeric("commission_due", { precision: 12, scale: 2 }),
  commissionPaidDate: date("commission_paid_date"),
  paymentMethod: text("payment_method"),
  paymentConfirmation: text("payment_confirmation"),
  notes: text("notes"),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "restrict" }),
  amountTotal: numeric("amount_total", { precision: 12, scale: 2 }).notNull(),
  depositAmount: numeric("deposit_amount", { precision: 12, scale: 2 }),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  balanceDue: numeric("balance_due", { precision: 12, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").notNull().default("unpaid"),
  paymentDate: date("payment_date"),
  paymentMethod: text("payment_method"),
  transactionConfirmation: text("transaction_confirmation"),
  receiptNumber: text("receipt_number"),
  refundStatus: refundStatusEnum("refund_status").notNull().default("none"),
});

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type NotaryLogEntry = typeof notaryLogEntries.$inferSelect;
export type ApostilleDetails = typeof apostilleDetails.$inferSelect;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type CaseStatusHistory = typeof caseStatusHistory.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NotaryServiceDetails = typeof notaryServiceDetails.$inferSelect;
export type TaxServiceDetails = typeof taxServiceDetails.$inferSelect;
export type BookkeepingServiceDetails =
  typeof bookkeepingServiceDetails.$inferSelect;
export type ImmigrationServiceDetails =
  typeof immigrationServiceDetails.$inferSelect;
export type CreditServiceDetails = typeof creditServiceDetails.$inferSelect;
export type ConsultingServiceDetails =
  typeof consultingServiceDetails.$inferSelect;

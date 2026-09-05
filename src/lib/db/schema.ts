import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  integer,
  serial,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";

export const serviceTypeEnum = pgEnum("service_type", [
  "online_notary",
  "document_prep",
  "tax_prep",
  "company_registration",
  "credit_financing",
  "leadership",
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

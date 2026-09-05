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
  // Phase 2, Session 5 — Academy/Training. A student is a paying client,
  // so this is a cases extension like every other category except
  // Community & Strategic Alliances (which isn't — see strategicAlliances
  // below, a standalone table with no client relationship).
  "academy",
  // Phase 2, Session 6 — Marketing / Branding / AI / Automation.
  "marketing",
  // Phase 5, Session 4 — Sales Tax Registration.
  "sales_tax",
  // Phase 5, Session 5 — IRS / EIN / ITIN Administrative Services.
  "irs_administrative",
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
  // Phase 4, Session 1 — Communications module. Appended rather than
  // reordered/renamed since ADD VALUE is the only additive path for a
  // Postgres enum; UI display order is controlled separately in
  // src/lib/validation/communication.ts.
  "sms",
  "facebook_messenger",
  "instagram_dm",
  "website_chat",
  "highlevel",
  "in_person",
  "other",
]);

export const conversationDirectionEnum = pgEnum("conversation_direction", [
  "inbound",
  "outbound",
]);

// Phase 4, Session 1 — Communications module record status.
export const conversationStatusEnum = pgEnum("conversation_status", [
  "new",
  "read",
  "replied",
  "pending_follow_up",
  "completed",
  "archived",
]);

// Phase 4, Session 3 — per-client channel readiness/consent, ahead of any
// live WhatsApp/Email/SMS integration.
export const whatsappContactStatusEnum = pgEnum("whatsapp_contact_status", [
  "not_connected",
  "connected",
  "consent_pending",
  "active",
  "opted_out",
]);

export const emailContactStatusEnum = pgEnum("email_contact_status", [
  "active",
  "unsubscribed",
  "bounced",
  "invalid",
  "consent_pending",
]);

export const smsContactStatusEnum = pgEnum("sms_contact_status", [
  "active",
  "opted_out",
  "invalid",
  "consent_pending",
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

// Phase 2, Session 7 — RBAC roles are modeled here and mapped to module
// access in src/lib/permissions.ts, but NOT yet enforced: sign-in stays
// restricted to the single ADMIN_EMAIL (src/auth.ts) per an explicit
// decision to keep single-tenant login for now. This column is reserved
// for when multi-staff login is turned on, same pattern as
// cases.assignedUserId and tasks.assignedUserId.
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "tax_staff",
  "bookkeeping_staff",
  "notary_staff",
  "consulting_staff",
  "academy_staff",
  "referral_manager",
  "community_manager",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: userRoleEnum("role"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Phase 5, Session 1 — Company Master Registry. This is the first single
// source of truth for "a business" in this CRM. Before this, business
// identity (name/entity type/industry/revenue range) was captured
// separately and redundantly in bookkeeping_service_details,
// business_formation_details, and rri_referral_details — each tied to one
// case/referral, with no link between them even when they described the
// same business. Those tables are untouched (existing rows/behavior don't
// change); going forward, Company 360 (a later session) treats `companies`
// as authoritative and those as historical case-level snapshots.
//
// Deliberately NOT included here, despite being named as company fields in
// the Phase 5 plan:
//   - Owner(s), Authorized Representative(s), Ownership Percentage — these
//     are per-owner facts (a company has *multiple* owners, each with
//     their own %), so they live on company_owners below, not as a single
//     company-level value.
//   - Tax Service Status, Bookkeeping Status, Consulting Status, CRM
//     Status, Marketing Status, Academy Status, RRI Referral Status —
//     storing these as separate manually-typed columns here would recreate
//     the exact duplication problem this table exists to fix. A later
//     session (Company 360) computes them live from the client's actual
//     linked cases/referrals instead.
export const companyEntityTypeEnum = pgEnum("company_entity_type", [
  "llc",
  "corporation",
  "s_corporation",
  "partnership",
  "sole_proprietor",
  "nonprofit",
  "other",
]);

// Deliberately narrower than the future IRS/EIN case-management module's
// own status enum (a later session) — this is just a registry-level
// summary, not a case tracker.
export const companyEinStatusEnum = pgEnum("company_ein_status", [
  "not_started",
  "applied",
  "received",
]);

export const companyAccountingMethodEnum = pgEnum("company_accounting_method", [
  "cash",
  "accrual",
]);

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  legalBusinessName: text("legal_business_name").notNull(),
  dbaName: text("dba_name"),
  entityType: companyEntityTypeEnum("entity_type"),
  stateOfFormation: text("state_of_formation"),
  formationDate: date("formation_date"),
  stateDocumentNumber: text("state_document_number"),
  einStatus: companyEinStatusEnum("ein_status").notNull().default("not_started"),
  // Only the last 4 digits are ever stored — never the full EIN.
  einLast4: text("ein_last4"),
  registeredAgent: text("registered_agent"),
  registeredAgentAddress: text("registered_agent_address"),
  principalBusinessAddress: text("principal_business_address"),
  mailingAddress: text("mailing_address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  industry: text("industry"),
  naicsCode: text("naics_code"),
  businessDescription: text("business_description"),
  yearsInBusiness: integer("years_in_business"),
  numberOfEmployees: integer("number_of_employees"),
  annualRevenueRange: text("annual_revenue_range"),
  monthlyRevenueRange: text("monthly_revenue_range"),
  fiscalYearEnd: text("fiscal_year_end"),
  accountingMethod: companyAccountingMethodEnum("accounting_method"),
  bookkeepingSoftware: text("bookkeeping_software"),
  payrollProvider: text("payroll_provider"),
  salesTaxRequired: boolean("sales_tax_required").notNull().default(false),
  salesTaxStates: text("sales_tax_states").array(),
  licensesRequired: text("licenses_required"),
  insuranceStatus: text("insurance_status"),
  // Relationship/institution name only — never account numbers or
  // credentials.
  bankingRelationship: text("banking_relationship"),
  businessCreditStatus: text("business_credit_status"),
  fundingNeeds: text("funding_needs"),
  notes: text("notes"),
});

// Phase 5, Session 1 — one row per owner; a company can have several.
// clientId is optional: an owner who is already a client links to that
// record instead of duplicating their contact info, but name/phone/email
// stay on this row too since not every owner is necessarily a client yet.
export const companyOwners = pgTable("company_owners", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  role: text("role"),
  ownershipPercentage: numeric("ownership_percentage", {
    precision: 5,
    scale: 2,
  }),
  phone: text("phone"),
  email: text("email"),
  preferredLanguage: text("preferred_language", { enum: ["en", "es"] }),
  authorizedSigner: boolean("authorized_signer").notNull().default(false),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
});

export const companyContacts = pgTable("company_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  role: text("role"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
});

// Distinct from Owners/Contacts — someone with legal authority to act for
// the company (e.g. sign filings) who isn't necessarily an owner.
export const companyAuthorizedRepresentatives = pgTable(
  "company_authorized_representatives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    role: text("role"),
    phone: text("phone"),
    email: text("email"),
    notes: text("notes"),
  },
);

// Phase 5, Session 3 — Company Document Checklist. Categories can recur
// (e.g. Tax Returns, one per year), so this is a plain list per company
// rather than one unique row per category.
export const companyDocumentCategoryEnum = pgEnum("company_document_category", [
  "formation_documents",
  "ein_documents",
  "operating_agreement",
  "bylaws",
  "state_registration",
  "annual_report",
  "business_licenses",
  "sales_tax",
  "insurance",
  "bookkeeping",
  "tax_returns",
  "contracts",
  "financing_documents",
  "other",
]);

export const companyDocumentChecklistStatusEnum = pgEnum(
  "company_document_checklist_status",
  ["requested", "received", "verified", "expired", "renewal_due"],
);

export const companyDocumentChecklistItems = pgTable(
  "company_document_checklist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    category: companyDocumentCategoryEnum("category").notNull(),
    description: text("description"),
    status: companyDocumentChecklistStatusEnum("status")
      .notNull()
      .default("requested"),
    dueDate: date("due_date"),
    notes: text("notes"),
  },
);

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
  // Phase 5, Session 1 — optional link to the Company Master Registry. A
  // client can represent/be associated with a company; not every client
  // has one (individual walk-in notary clients, for example, never will).
  companyId: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
});

// Phase 4, Session 3 — one optional row per client, the same 1:1-extension
// pattern as the Phase 2 case-detail tables, but keyed on clientId since
// channel readiness/consent belongs to the client, not any one case.
// clients.email/clients.phone are reused as-is for Email Address/Mobile
// Number rather than duplicated here; whatsappNumber gets its own field
// since a client's WhatsApp number is often a different number.
export const clientCommunicationPreferences = pgTable(
  "client_communication_preferences",
  {
    clientId: uuid("client_id")
      .primaryKey()
      .references(() => clients.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    preferredChannel: conversationChannelEnum("preferred_channel"),
    emailConsent: boolean("email_consent").notNull().default(false),
    smsConsent: boolean("sms_consent").notNull().default(false),
    whatsappConsent: boolean("whatsapp_consent").notNull().default(false),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    partnerReferralConsent: boolean("partner_referral_consent")
      .notNull()
      .default(false),
    consentDate: date("consent_date"),
    consentSource: text("consent_source"),
    optOutDate: date("opt_out_date"),
    // WhatsApp
    whatsappNumber: text("whatsapp_number"),
    whatsappContactStatus: whatsappContactStatusEnum("whatsapp_contact_status")
      .notNull()
      .default("not_connected"),
    // Auto-updated by createCommunicationAction/updateCommunicationAction
    // whenever a communication is logged on this channel — not hand-edited.
    lastWhatsappMessageAt: timestamp("last_whatsapp_message_at", {
      withTimezone: true,
    }),
    nextWhatsappFollowUpDate: date("next_whatsapp_follow_up_date"),
    whatsappTemplateUsed: text("whatsapp_template_used"),
    // Email
    emailStatus: emailContactStatusEnum("email_status")
      .notNull()
      .default("consent_pending"),
    lastEmailSentAt: timestamp("last_email_sent_at", { withTimezone: true }),
    lastEmailReceivedAt: timestamp("last_email_received_at", {
      withTimezone: true,
    }),
    lastEmailSubject: text("last_email_subject"),
    emailTemplateUsed: text("email_template_used"),
    nextEmailFollowUpDate: date("next_email_follow_up_date"),
    // SMS
    smsStatus: smsContactStatusEnum("sms_status")
      .notNull()
      .default("consent_pending"),
    lastSmsSentAt: timestamp("last_sms_sent_at", { withTimezone: true }),
    lastSmsReceivedAt: timestamp("last_sms_received_at", {
      withTimezone: true,
    }),
    smsTemplateUsed: text("sms_template_used"),
    nextSmsFollowUpDate: date("next_sms_follow_up_date"),
  },
);

// Phase 4, Session 4 — Facebook Messenger and Instagram share the same
// Meta-platform lifecycle ("prepare for future Meta / HighLevel connection"
// in the spec for both), so one enum covers both rather than two identical
// ones.
export const metaChannelStatusEnum = pgEnum("meta_channel_status", [
  "not_connected",
  "connected",
  "consent_pending",
  "active",
  "opted_out",
]);

export const websiteSourceEnum = pgEnum("website_source", [
  "anthonyservice_com",
  "anthonyfinancial360_com",
  "anthonymultiservice_net",
  "anthonymultiserviceacademy_ai",
  "other",
]);

// Phase 4, Session 4 — a thread, not a message: clientId/caseId are
// nullable because a Facebook/Instagram conversation often arrives before
// anyone has matched it to a client record. Individual message content
// still belongs in conversation_messages (channel: facebook_messenger) via
// the Communications module — this table tracks the thread's own state.
export const facebookMessengerThreads = pgTable("facebook_messenger_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  facebookProfile: text("facebook_profile"),
  status: metaChannelStatusEnum("status").notNull().default("not_connected"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  // Reserved for the future staff/role system — same unpopulated pattern as
  // cases.assignedUserId; no picker UI yet.
  assignedUserId: uuid("assigned_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  followUpDate: date("follow_up_date"),
});

export const instagramDmThreads = pgTable("instagram_dm_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  instagramUsername: text("instagram_username"),
  status: metaChannelStatusEnum("status").notNull().default("not_connected"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  assignedUserId: uuid("assigned_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  followUpDate: date("follow_up_date"),
});

// Phase 4, Session 4 — a website chat visitor is frequently not a client
// yet at all (anonymous site visitor), so this is a plain event log with
// an optional clientId rather than a client-keyed extension table.
export const websiteChatSessions = pgTable("website_chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  websiteSource: websiteSourceEnum("website_source").notNull(),
  visitorName: text("visitor_name"),
  visitorEmail: text("visitor_email"),
  visitorPhone: text("visitor_phone"),
  language: text("language", { enum: ["en", "es"] }),
  serviceInterest: serviceTypeEnum("service_interest"),
  message: text("message").notNull(),
  // Reuses conversation_status rather than a redundant parallel enum with
  // identical New/Read/Replied/Pending Follow-Up/Completed/Archived values.
  conversationStatus: conversationStatusEnum("conversation_status")
    .notNull()
    .default("new"),
  assignedUserId: uuid("assigned_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  followUpDate: date("follow_up_date"),
});

// Phase 4, Session 5 — shared by client_highlevel_sync.sync_status and
// integration_settings.status: both describe the same lifecycle for a
// prepared-but-not-yet-active connection.
export const integrationSyncStatusEnum = pgEnum("integration_sync_status", [
  "not_connected",
  "ready",
  "connected",
  "syncing",
  "error",
  "paused",
]);

export const highlevelSyncDirectionEnum = pgEnum("highlevel_sync_direction", [
  "crm_to_highlevel",
  "highlevel_to_crm",
  "two_way",
]);

// Phase 4, Session 5 — one optional row per client (same 1:1-extension
// pattern as client_communication_preferences), holding only HighLevel's
// own record identifiers and sync bookkeeping. The actual field values
// HighLevel would receive (name, phone, email, language, ...) are never
// duplicated here — see getHighLevelSyncPreview, which reads them live
// from clients/cases/appointments/client_communication_preferences so
// there is exactly one source of truth for each.
export const clientHighlevelSync = pgTable("client_highlevel_sync", {
  clientId: uuid("client_id")
    .primaryKey()
    .references(() => clients.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  highlevelContactId: text("highlevel_contact_id"),
  highlevelOpportunityId: text("highlevel_opportunity_id"),
  highlevelLocationId: text("highlevel_location_id"),
  highlevelTag: text("highlevel_tag"),
  highlevelPipeline: text("highlevel_pipeline"),
  syncStatus: integrationSyncStatusEnum("sync_status")
    .notNull()
    .default("not_connected"),
  syncDirection: highlevelSyncDirectionEnum("sync_direction"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncResult: text("last_sync_result"),
});

// Phase 4, Session 5 — global (not per-client) settings for the 13
// integrations listed in the Phase 4 plan's "Future Integration
// Architecture" section. Rows are created lazily (upsert on first edit)
// rather than seeded, keyed by a static integrationKey defined in
// src/lib/integrations.ts alongside each integration's display name,
// category, and connection type. No credentials live here or anywhere in
// the database — secrets stay in server environment variables only.
export const integrationSettings = pgTable("integration_settings", {
  integrationKey: text("integration_key").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: integrationSyncStatusEnum("status").notNull().default("not_connected"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastError: text("last_error"),
  connectedAccount: text("connected_account"),
  notes: text("notes"),
});

// Phase 4, Session 6 — Message Template Library.
export const messageTemplateCategoryEnum = pgEnum("message_template_category", [
  "welcome",
  "appointment_confirmation",
  "appointment_reminder",
  "documents_requested",
  "documents_missing",
  "payment_reminder",
  "invoice_sent",
  "payment_received",
  "service_update",
  "referral_update",
  "rri_referral_update",
  "follow_up",
  "thank_you",
  "review_request",
  "academy_welcome",
  "academy_reminder",
  "partner_communication",
]);

export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull(),
  language: text("language", { enum: ["en", "es"] }).notNull(),
  channel: conversationChannelEnum("channel").notNull(),
  category: messageTemplateCategoryEnum("category").notNull(),
  subject: text("subject"),
  messageBody: text("message_body").notNull(),
  active: boolean("active").notNull().default(true),
  // Snapshot of the acting session's email — same reasoning as
  // caseStatusHistory.changedByEmail; no populated users table yet.
  createdByEmail: text("created_by_email"),
});

// Phase 4, Session 7 — communication security audit trail (spec #13):
// message creation, template changes, consent changes, channel status
// changes, and integration changes all write one row here via
// src/lib/audit.ts's logAuditEvent(). Append-only, no update/delete UI,
// same non-tamperable spirit as case_status_history.
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  summary: text("summary").notNull(),
});

// Phase 4, Session 8 — "My Professional Systems" (spec #14/#15). category
// and icon are free text (not enums) since Admin can add new cards with
// categories not anticipated here. url is nullable — the business's own
// account URL for Tax/Bookkeeping/Consulting Software and HighLevel/
// Academy isn't specified anywhere in the plan, so those seed rows start
// blank for Admin to fill in rather than guessing one.
export const professionalSystemConnectionStatusEnum = pgEnum(
  "professional_system_connection_status",
  ["link_only", "api_available", "webhook_available", "connected", "not_connected", "error"],
);

export const professionalSystemIntegrationTypeEnum = pgEnum(
  "professional_system_integration_type",
  ["external_link", "api", "webhook", "oauth", "manual", "unknown"],
);

export const professionalSystems = pgTable("professional_systems", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  url: text("url"),
  icon: text("icon"),
  description: text("description"),
  connectionStatus: professionalSystemConnectionStatusEnum("connection_status")
    .notNull()
    .default("not_connected"),
  integrationType: professionalSystemIntegrationTypeEnum("integration_type")
    .notNull()
    .default("unknown"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  openInNewTab: boolean("open_in_new_tab").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Phase 4, Session 8 — "My Websites" (spec #16). status is a manually-set
// field (Admin marks it), not a live uptime check — building a real
// health-check crawler is out of scope for "prepare the dashboard".
export const websiteLinkStatusEnum = pgEnum("website_link_status", [
  "active",
  "inactive",
  "unknown",
]);

export const websiteLinks = pgTable("website_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull().unique(),
  url: text("url").notNull(),
  status: websiteLinkStatusEnum("status").notNull().default("unknown"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
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
  // Phase 2, Session 7 — created by the scheduled inactivity sweep
  // (see src/app/api/cron/inactivity-check/route.ts), not from case actions.
  "inactivity_alert",
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

// Phase 5, Session 6 — Immigration Client Document Folders (spec section
// 6). A fixed folder taxonomy for documents attached to an Immigration
// Administrative Services case; nullable since it's meaningless for
// documents on any other case type. Role-based access restricting this to
// Immigration Staff + Admin is design-only until the RBAC role system
// itself lands (Phase 5, Session 8) — the folder structure is built now so
// that session has something to gate.
export const immigrationDocumentFolderEnum = pgEnum("immigration_document_folder", [
  "intake",
  "identity_documents",
  "client_provided_information",
  "government_forms",
  "supporting_documents",
  "translation",
  "signatures",
  "filing_confirmation",
  "government_notices",
  "final_documents",
]);

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
  // Phase 5, Session 6 — only set for documents on an Immigration
  // Administrative Services case; null for every other document.
  folder: immigrationDocumentFolderEnum("folder"),
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

// Phase 2, Session 4 — Business Formation category.
// Reuses the existing `company_registration` service_type (0 existing
// rows, exact semantic match).
export const formationTypeEnum = pgEnum("formation_type", [
  "llc",
  "corporation",
  "nonprofit",
  "other",
]);

export const formationCaseStatusEnum = pgEnum("formation_case_status", [
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
]);

export const businessFormationDetails = pgTable("business_formation_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  formationType: formationTypeEnum("formation_type"),
  stateOfFormation: text("state_of_formation"),
  businessName: text("business_name"),
  nameAvailabilityChecked: boolean("name_availability_checked")
    .notNull()
    .default(false),
  registeredAgent: text("registered_agent"),
  einAssistance: boolean("ein_assistance").notNull().default(false),
  stateFilingDate: date("state_filing_date"),
  stateApprovalDate: date("state_approval_date"),
  // Reuses the same not_started/in_progress/ready/delivered tracker
  // introduced in Session 2 for bookkeeping reports and translations.
  documentDeliveryStatus: deliverableStatusEnum("document_delivery_status"),
  governmentFee: numeric("government_fee", { precision: 12, scale: 2 }),
  status: formationCaseStatusEnum("status").notNull().default("new_inquiry"),
});

// Phase 2, Session 5 — Academy / Training category.
// Reuses cases.startDate for "Start Date" (when the cohort/program begins)
// and adds a separate enrollmentDate here, since a student can enroll
// before the program actually starts.
export const academyCaseStatusEnum = pgEnum("academy_case_status", [
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
]);

// HighLevel sync is prepared here as a data field only — Session 7 is
// where the actual integration gets activated, per the phase plan.
export const highlevelSyncStatusEnum = pgEnum("highlevel_sync_status", [
  "not_synced",
  "synced",
  "error",
]);

export const academyEnrollmentDetails = pgTable("academy_enrollment_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  program: text("program"),
  course: text("course"),
  enrollmentDate: date("enrollment_date"),
  modulesCompleted: integer("modules_completed"),
  progressPercentage: integer("progress_percentage"),
  attendancePercentage: integer("attendance_percentage"),
  assignmentsCompleted: integer("assignments_completed"),
  finalEvaluation: text("final_evaluation"),
  certificateDate: date("certificate_date"),
  communityAccess: boolean("community_access").notNull().default(false),
  highlevelSyncStatus: highlevelSyncStatusEnum("highlevel_sync_status")
    .notNull()
    .default("not_synced"),
  status: academyCaseStatusEnum("status").notNull().default("lead"),
});

// Phase 2, Session 6 — Marketing / Branding / AI / Automation category.
// "Deadline" reuses cases.dueDate and "Responsible User" reuses the
// already-reserved cases.assignedUserId (same not-yet-wired-into-UI
// pattern as documents.uploadedBy) rather than adding duplicate fields.
export const projectTypeEnum = pgEnum("project_type", [
  "marketing",
  "branding",
  "crm",
  "automation",
  "ai",
]);

export const marketingCaseStatusEnum = pgEnum("marketing_case_status", [
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
]);

export const marketingProjectDetails = pgTable("marketing_project_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  projectType: projectTypeEnum("project_type"),
  businessGoal: text("business_goal"),
  currentSystems: text("current_systems"),
  deliverables: text("deliverables"),
  integrationsRequired: text("integrations_required"),
  aiAgentRequired: boolean("ai_agent_required").notNull().default(false),
  completionPercentage: integer("completion_percentage"),
  status: marketingCaseStatusEnum("status").notNull().default("discovery"),
});

// Phase 5, Session 4 — Sales Tax Registration category. Links to the
// Company Master Registry (Phase 5, Session 1) via companyId instead of
// duplicating business name/entity type columns the way older extension
// tables above (bookkeeping, formation) do — those predate `companies`.
export const salesTaxCaseStatusEnum = pgEnum("sales_tax_case_status", [
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
]);

export const salesTaxFilingFrequencyEnum = pgEnum("sales_tax_filing_frequency", [
  "monthly",
  "quarterly",
  "annual",
  "other",
]);

export const salesTaxCaseDetails = pgTable("sales_tax_case_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  state: text("state").notNull(),
  stateTaxAgency: text("state_tax_agency"),
  agencyWebsite: text("agency_website"),
  registrationPortalUrl: text("registration_portal_url"),
  salesTaxAccountNumber: text("sales_tax_account_number"),
  status: salesTaxCaseStatusEnum("status").notNull().default("not_started"),
  registrationDate: date("registration_date"),
  effectiveDate: date("effective_date"),
  filingFrequency: salesTaxFilingFrequencyEnum("filing_frequency"),
  nextFilingDueDate: date("next_filing_due_date"),
  lastFiledPeriod: text("last_filed_period"),
  lastFilingDate: date("last_filing_date"),
  amountDue: numeric("amount_due", { precision: 12, scale: 2 }),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }),
  paymentDate: date("payment_date"),
  accountStatus: text("account_status"),
});

// Reference data backing the Interactive Sales Tax Map (spec section 2).
// Deliberately starts empty rather than seeded with guessed government
// URLs — an admin fills each state in via the map UI, and a state with no
// row yet simply renders Gray ("no records yet"), which is one of the
// map's defined states, not an error condition.
export const salesTaxStateInfo = pgTable("sales_tax_state_info", {
  state: text("state").primaryKey(),
  stateTaxAgency: text("state_tax_agency"),
  officialWebsite: text("official_website"),
  registrationLink: text("registration_link"),
  filingPortalLink: text("filing_portal_link"),
  businessRegistrationLink: text("business_registration_link"),
  notes: text("notes"),
  lastVerifiedDate: date("last_verified_date"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Phase 5, Session 5 — IRS / EIN / ITIN Case Management. Links to the
// Company Master Registry via companyId instead of duplicating business
// name/entity type, same principle as salesTaxCaseDetails above. EIN/ITIN
// status are only meaningful for their matching caseType; applicationStatus
// covers the remaining case types (business account follow-up, IRS
// correspondence, other). SECURITY: no full SSN/ITIN/passport columns —
// irsReferenceNumber is an IRS-issued submission reference, not identity
// data.
export const irsCaseTypeEnum = pgEnum("irs_case_type", [
  "ein_assistance",
  "itin_assistance",
  "business_account_follow_up",
  "irs_correspondence",
  "other",
]);

export const irsEinStatusEnum = pgEnum("irs_ein_status", [
  "not_started",
  "information_pending",
  "ready",
  "submitted",
  "ein_received",
  "closed",
]);

export const irsItinStatusEnum = pgEnum("irs_itin_status", [
  "not_started",
  "documents_pending",
  "w7_preparation",
  "certification_documentation_step",
  "submitted",
  "irs_processing",
  "additional_information_requested",
  "itin_received",
  "closed",
]);

export const irsApplicationStatusEnum = pgEnum("irs_application_status", [
  "not_started",
  "in_progress",
  "submitted",
  "resolved",
  "closed",
]);

export const irsCaseDetails = pgTable("irs_case_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  caseType: irsCaseTypeEnum("case_type").notNull().default("ein_assistance"),
  taxpayerName: text("taxpayer_name"),
  responsibleParty: text("responsible_party"),
  state: text("state"),
  submissionMethod: text("submission_method"),
  submissionDate: date("submission_date"),
  irsReferenceNumber: text("irs_reference_number"),
  einStatus: irsEinStatusEnum("ein_status"),
  itinStatus: irsItinStatusEnum("itin_status"),
  applicationStatus: irsApplicationStatusEnum("application_status"),
  irsLetterReceived: boolean("irs_letter_received").notNull().default(false),
  irsLetterDate: date("irs_letter_date"),
});

// IRS Official Resource Center (spec section 4) — an admin-managed
// directory of official IRS.gov links, not a live IRS integration.
export const irsResourceCategoryEnum = pgEnum("irs_resource_category", [
  "ein",
  "itin",
  "business_taxes",
  "employment_taxes",
  "estimated_taxes",
  "irs_forms",
  "irs_publications",
  "irs_notices",
  "irs_contact_resources",
]);

export const irsResources = pgTable("irs_resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull(),
  category: irsResourceCategoryEnum("category").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  lastVerifiedDate: date("last_verified_date"),
  active: boolean("active").notNull().default(true),
});

// Phase 5, Session 6 — Immigration Forms Library (spec section 5), an
// admin-managed directory of official USCIS forms, not a live USCIS
// integration or an editable copy of the government form itself.
export const immigrationFormCategoryEnum = pgEnum("immigration_form_category", [
  "family_based",
  "employment_based",
  "humanitarian",
  "citizenship_naturalization",
  "permanent_residence",
  "work_authorization",
  "travel_documents",
  "affidavits_supporting_forms",
  "change_of_address",
  "fee_waivers",
  "uscis_general_forms",
  "other",
]);

export const immigrationForms = pgTable("immigration_forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  formNumber: text("form_number").notNull(),
  formName: text("form_name").notNull(),
  category: immigrationFormCategoryEnum("category").notNull(),
  officialSource: text("official_source"),
  officialUrl: text("official_url").notNull(),
  currentEditionDate: date("current_edition_date"),
  editionNotes: text("edition_notes"),
  filingFeeReference: text("filing_fee_reference"),
  instructionsUrl: text("instructions_url"),
  checklist: text("checklist"),
  internalNotes: text("internal_notes"),
  lastVerifiedDate: date("last_verified_date"),
  active: boolean("active").notNull().default(true),
});

// Phase 5, Session 7 — Associations & Chambers Directory (spec section 9).
// Deliberately a standalone table rather than extending Strategic
// Alliances (Phase 2): that module tracks referral/commission partners
// (CPAs, attorneys, insurance, realtors) with referral-agreement fields
// that don't apply here, while this one tracks membership-organization
// relationships (dues, membership status, Latino-focus) with its own
// status pipeline. Confirmed with the user rather than assumed.
export const associationOrganizationTypeEnum = pgEnum(
  "association_organization_type",
  [
    "latino_chamber",
    "chamber_of_commerce",
    "business_association",
    "professional_association",
    "community_organization",
    "faith_based_organization",
    "other",
  ],
);

export const associationRelationshipStatusEnum = pgEnum(
  "association_relationship_status",
  [
    "research",
    "prospect",
    "contacted",
    "meeting_scheduled",
    "member",
    "strategic_partner",
    "inactive",
  ],
);

export const associationsChambers = pgTable("associations_chambers", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  organizationName: text("organization_name").notNull(),
  organizationType: associationOrganizationTypeEnum("organization_type")
    .notNull()
    .default("other"),
  state: text("state"),
  city: text("city"),
  country: text("country"),
  website: text("website"),
  phone: text("phone"),
  email: text("email"),
  contactPerson: text("contact_person"),
  industryFocus: text("industry_focus"),
  latinoFocus: boolean("latino_focus").notNull().default(false),
  membershipStatus: text("membership_status"),
  membershipCost: text("membership_cost"),
  amsRelationshipStatus: associationRelationshipStatusEnum(
    "ams_relationship_status",
  )
    .notNull()
    .default("research"),
  dateContacted: date("date_contacted"),
  lastContact: date("last_contact"),
  nextFollowUp: date("next_follow_up"),
  partnershipOpportunity: text("partnership_opportunity"),
  notes: text("notes"),
});

// Phase 5, Session 7 — Latino Business Opportunity Map (spec sections 7-8).
// Population/business-presence/industry/source fields are admin-maintained
// from public data (Census, SBA, etc.) since AMS has no internal source for
// them. Associations/Chambers/Strategic-Partner counts are computed live
// from associationsChambers and strategicAlliances (grouped by state)
// instead of duplicated here. AMS Clients/Leads/Revenue stay admin-entered
// placeholders until Map + Company Integration (Phase 5, Session 8) wires
// them to real client/case data by state.
export const latinoOpportunityScoreEnum = pgEnum("latino_opportunity_score", [
  "very_high",
  "high",
  "medium",
  "emerging",
  "insufficient_data",
]);

export const latinoBusinessOpportunityData = pgTable(
  "latino_business_opportunity_data",
  {
    state: text("state").primaryKey(),
    estimatedLatinoPopulation: integer("estimated_latino_population"),
    estimatedLatinoBusinessPresence: integer(
      "estimated_latino_business_presence",
    ),
    topIndustries: text("top_industries"),
    amsClientsCount: integer("ams_clients_count"),
    amsLeadsCount: integer("ams_leads_count"),
    revenueFromState: numeric("revenue_from_state", {
      precision: 12,
      scale: 2,
    }),
    opportunityScore: latinoOpportunityScoreEnum("opportunity_score")
      .notNull()
      .default("insufficient_data"),
    potentialServices: text("potential_services"),
    expansionNotes: text("expansion_notes"),
    notes: text("notes"),
    sourceName: text("source_name"),
    sourceUrl: text("source_url"),
    sourceYear: integer("source_year"),
    sourceLastUpdated: date("source_last_updated"),
    sourceDataType: text("source_data_type"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

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
  // Phase 4, Session 1 — Communications module fields, additive on top of
  // the Phase 1 conversation log. communicationSeq gives the record a
  // friendly "COM-00001" ID the same way invoices/referrals get one.
  communicationSeq: serial("communication_seq").notNull().unique(),
  businessName: text("business_name"),
  referralId: uuid("referral_id").references(() => referrals.id, {
    onDelete: "set null",
  }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  // Reserved for the future staff/role system — same unpopulated-until-
  // multi-user-login pattern as cases.assignedUserId; no picker UI yet.
  assignedUserId: uuid("assigned_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  fullMessage: text("full_message"),
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDate: date("follow_up_date"),
  status: conversationStatusEnum("status").notNull().default("new"),
  // Snapshot of the acting session's email, same reasoning as
  // caseStatusHistory.changedByEmail — there's no populated users table yet.
  createdByEmail: text("created_by_email"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Phase 2, Session 4 — discriminates plain internal referrals from
// Commercial Finance/RRI referrals, the same way cases.serviceType picks
// which extension table applies. Existing rows default to "general".
export const referralCategoryEnum = pgEnum("referral_category", [
  "general",
  "commercial_finance",
]);

export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  referralSeq: serial("referral_seq").notNull().unique(),
  referralDate: date("referral_date").notNull().defaultNow(),
  category: referralCategoryEnum("category").notNull().default("general"),
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
  commissionDueDate: date("commission_due_date"),
  commissionPaidDate: date("commission_paid_date"),
  paymentMethod: text("payment_method"),
  paymentConfirmation: text("payment_confirmation"),
  notes: text("notes"),
});

export const referralStatusHistory = pgTable("referral_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  referralId: uuid("referral_id")
    .notNull()
    .references(() => referrals.id, { onDelete: "cascade" }),
  previousStatus: referralStatusEnum("previous_status"),
  newStatus: referralStatusEnum("new_status").notNull(),
  changedByEmail: text("changed_by_email"),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  note: text("note"),
});

// Commercial Finance / RRI Referrals category — a 1:1 extension of a
// referral row rather than a cases row, since this tracks a business we
// refer OUT to the RRI lending partner (the opposite direction from a
// normal incoming referral), not a service Anthony Multiservice performs.
export const rriStatusEnum = pgEnum("rri_status", [
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
]);

export const rriReferralDetails = pgTable("rri_referral_details", {
  referralId: uuid("referral_id")
    .primaryKey()
    .references(() => referrals.id, { onDelete: "cascade" }),
  businessName: text("business_name"),
  businessEntity: text("business_entity"),
  industry: text("industry"),
  yearsInBusiness: integer("years_in_business"),
  fundingPurpose: text("funding_purpose"),
  amountRequested: numeric("amount_requested", { precision: 12, scale: 2 }),
  monthlyRevenueRange: text("monthly_revenue_range"),
  financingType: text("financing_type"),
  documentsRequested: text("documents_requested"),
  documentsReceived: text("documents_received"),
  consentToShareInformation: boolean("consent_to_share_information")
    .notNull()
    .default(false),
  status: rriStatusEnum("status").notNull().default("new_referral"),
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

// Phase 2, Session 5 — Community & Strategic Alliances.
// Deliberately NOT a cases extension: a church, chamber of commerce, CPA,
// or attorney partner isn't a paying client, so this is its own
// standalone table with no clientId relationship at all.
export const organizationTypeEnum = pgEnum("organization_type", [
  "church",
  "chamber_of_commerce",
  "cpa_accountant",
  "attorney",
  "insurance",
  "realtor",
  "consultant",
  "financial_partner",
  "technology_partner",
  "community_organization",
  "professional_association",
  "other",
]);

export const allianceStatusEnum = pgEnum("alliance_status", [
  "prospect",
  "contacted",
  "meeting_scheduled",
  "under_discussion",
  "agreement_review",
  "active_partner",
  "paused",
  "inactive",
]);

export const strategicAlliances = pgTable("strategic_alliances", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  organizationName: text("organization_name").notNull(),
  contactPerson: text("contact_person"),
  organizationType: organizationTypeEnum("organization_type"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  state: text("state"),
  country: text("country"),
  relationshipOwner: text("relationship_owner"),
  dateIntroduced: date("date_introduced"),
  servicesConnected: text("services_connected"),
  referralAgreement: boolean("referral_agreement").notNull().default(false),
  commissionAgreement: boolean("commission_agreement")
    .notNull()
    .default(false),
  marketingPermission: boolean("marketing_permission")
    .notNull()
    .default(false),
  logoPermission: boolean("logo_permission").notNull().default(false),
  lastContact: date("last_contact"),
  nextFollowUp: date("next_follow_up"),
  status: allianceStatusEnum("status").notNull().default("prospect"),
  notes: text("notes"),
});

export const allianceStatusHistory = pgTable("alliance_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  allianceId: uuid("alliance_id")
    .notNull()
    .references(() => strategicAlliances.id, { onDelete: "cascade" }),
  previousStatus: allianceStatusEnum("previous_status"),
  newStatus: allianceStatusEnum("new_status").notNull(),
  changedByEmail: text("changed_by_email"),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  note: text("note"),
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
export type ClientCommunicationPreferences =
  typeof clientCommunicationPreferences.$inferSelect;
export type FacebookMessengerThread =
  typeof facebookMessengerThreads.$inferSelect;
export type InstagramDmThread = typeof instagramDmThreads.$inferSelect;
export type WebsiteChatSession = typeof websiteChatSessions.$inferSelect;
export type ClientHighlevelSync = typeof clientHighlevelSync.$inferSelect;
export type IntegrationSettingsRow = typeof integrationSettings.$inferSelect;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type CompanyOwner = typeof companyOwners.$inferSelect;
export type CompanyContact = typeof companyContacts.$inferSelect;
export type CompanyAuthorizedRepresentative =
  typeof companyAuthorizedRepresentatives.$inferSelect;
export type CompanyDocumentChecklistItem =
  typeof companyDocumentChecklistItems.$inferSelect;
export type SalesTaxCaseDetails = typeof salesTaxCaseDetails.$inferSelect;
export type SalesTaxStateInfo = typeof salesTaxStateInfo.$inferSelect;
export type IrsCaseDetails = typeof irsCaseDetails.$inferSelect;
export type IrsResource = typeof irsResources.$inferSelect;
export type ImmigrationForm = typeof immigrationForms.$inferSelect;
export type AssociationChamber = typeof associationsChambers.$inferSelect;
export type LatinoBusinessOpportunityData =
  typeof latinoBusinessOpportunityData.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type ProfessionalSystem = typeof professionalSystems.$inferSelect;
export type WebsiteLink = typeof websiteLinks.$inferSelect;
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
export type BusinessFormationDetails =
  typeof businessFormationDetails.$inferSelect;
export type ReferralStatusHistory = typeof referralStatusHistory.$inferSelect;
export type RriReferralDetails = typeof rriReferralDetails.$inferSelect;
export type AcademyEnrollmentDetails =
  typeof academyEnrollmentDetails.$inferSelect;
export type StrategicAlliance = typeof strategicAlliances.$inferSelect;
export type AllianceStatusHistory =
  typeof allianceStatusHistory.$inferSelect;
export type MarketingProjectDetails =
  typeof marketingProjectDetails.$inferSelect;

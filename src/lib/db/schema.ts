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
  jsonb,
  pgEnum,
  uniqueIndex,
  primaryKey,
  index,
  type AnyPgColumn,
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
  // Documents-cabinet follow-up — Workers Comp, Liability Insurance,
  // Payroll, HIPAA Compliance, and general Insurance, previously handled
  // informally under Bookkeeping/Consulting/Formation. One service type
  // with a subType (see insuranceComplianceTypeEnum below), same pattern
  // as irs_administrative's own caseType.
  "insurance_compliance",
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

// Calendar enhancement, Session 1 — the 4 original values are kept as-is
// (Postgres enums only support adding values, never renaming/removing —
// see AGENTS.md), with the 5 new statuses from the plan appended.
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
  "requested",
  "confirmed",
  "checked_in",
  "in_progress",
  "rescheduled",
]);

export const appointmentTypeEnum = pgEnum("appointment_type", [
  "in_person",
  "phone",
  "zoom",
  "google_meet",
  "virtual",
  "mobile_service",
  "ron",
  "other",
]);

// Calendar enhancement, Session 7 (section 12) — "preparar pero NO
// activar" Google Calendar / Outlook / HighLevel Calendar / Zoom / Google
// Meet. Which of these five systems a given appointment would sync to,
// once that integration is actually built.
export const externalCalendarProviderEnum = pgEnum("external_calendar_provider", [
  "google_calendar",
  "outlook_calendar",
  "highlevel_calendar",
  "zoom",
  "google_meet",
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
  // Registration only — no API connection, no publishing. Same posture as
  // every other channel here until its integration is explicitly built.
  "youtube",
  "tiktok",
  "linkedin",
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
// access in src/lib/permissions.ts. Phase 2H made that mapping the real
// enforcement layer; Phase 2H-B made `users` the real internal-staff
// identity table (see the comment on `users` below) — sign-in is no
// longer restricted to only ADMIN_EMAIL, but to ADMIN_EMAIL plus any
// email with an active row here. super_admin/instructor/general_staff
// were added to the TypeScript Role union in Phase 2H without a matching
// DB enum value (nothing wrote a role into a DB row yet); Phase 2H-B adds
// them here too so the two vocabularies can't silently diverge now that
// real rows exist. super_admin is still never written to any row — it is
// derived purely from ADMIN_EMAIL (src/auth.ts / getCurrentRole) and is
// deliberately excluded from the assignable-role list in
// src/lib/validation/authorizedUser.ts.
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
  // Phase 5, Session 8 — Immigration Staff (spec section 17): scoped to
  // immigration administrative cases only, including the Immigration
  // Forms Library and the per-case document folders (Session 6).
  "immigration_staff",
  // Phase 2H-B additions — kept in sync with roleValues in
  // src/lib/permissions.ts. super_admin is never assigned to a row (see
  // above); instructor and general_staff start with empty permission
  // arrays until a real course-scoped relationship / explicit area grants
  // exist (see the comment on users.instructorId below).
  "super_admin",
  "instructor",
  "general_staff",
]);

// Phase 2H-B — this is now the real internal-staff identity table: a row
// here plus an active status is what lets a Google account other than
// ADMIN_EMAIL sign in at all (src/auth.ts signIn callback), and `role`
// drives what it can do (src/lib/permissions.ts getCurrentRole). The
// owner (ADMIN_EMAIL) deliberately never needs a row here — see Phase
// 2H-B report section E.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Canonical identity key: the authenticated Google account's email,
  // always normalized to lowercase before insert/lookup (never matched by
  // name). Case-sensitive uniqueness at the DB level is acceptable only
  // because every write path normalizes first — see
  // src/lib/queries/authorizedUsers.ts.
  email: text("email").notNull().unique(),
  // Legacy column from an earlier Credentials-based design this project
  // never shipped (see AGENTS.md: Google-only, no password flow). Made
  // nullable rather than dropped (additive-only migration policy) —
  // Google-authenticated internal users never have a password hash.
  passwordHash: text("password_hash"),
  name: text("name"),
  role: userRoleEnum("role"),
  // Phase 2H-B — lets an authorized row exist without yet granting
  // access, and lets an admin revoke access without deleting history.
  // Checked on every permission check (getCurrentRole), not just at
  // sign-in, so deactivating someone takes effect on their very next
  // action, not just their next login.
  isActive: boolean("is_active").notNull().default(true),
  // Phase 2H-B, section 8 — the minimal additive relationship audited and
  // required before any future course-scoped Instructor authorization can
  // be built. Nullable and onDelete "set null" (never cascade, same
  // convention as notary_log_entries) so deleting an instructor record
  // never deletes a login identity. Linking a user here today grants NO
  // additional access by itself — ROLE_PERMISSIONS.instructor is still
  // `[]` (empty) until a later phase implements real course-scoped
  // checks against academyCourses.primaryInstructorId. There is
  // deliberately no UI to set this yet (see report section L).
  instructorId: uuid("instructor_id").references(() => academyInstructors.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
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
  // Document-cabinet folder label (e.g. "001") — free-text, set/edited by
  // staff, not auto-generated. Purely a display label for the Documents
  // module's per-client sub-folder; carries no other meaning.
  folderNumber: text("folder_number"),
  // Client portal (Step 2B) — contact details the client can keep up to
  // date themselves (every change also creates a staff review task).
  address: text("address"),
  bestTimeToCall: text("best_time_to_call", {
    enum: ["morning", "midday", "afternoon", "evening"],
  }),
  // Optional square profile photo in private Vercel Blob. Only ever
  // streamed through /api/portal/profile/photo (the client) or
  // /api/clients/[id]/photo (staff) — never linked directly.
  photoBlobUrl: text("photo_blob_url"),
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
    // Client portal (Step 2B) — "I agree to be called by phone".
    phoneCallConsent: boolean("phone_call_consent").notNull().default(false),
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
  // Documents-cabinet follow-up — created by the scheduled renewal sweep
  // (see src/app/api/cron/renewal-check/route.ts) when an Insurance &
  // Compliance case's expirationDate falls inside its renewalReminderDays
  // window.
  "renewal_reminder",
  // Calendar enhancement, Session 5 (section 8) — "Creada -> crear tarea de
  // confirmación si aplica" and "24h antes / 2h antes -> preparar
  // recordatorio". Both dedupe per appointment via tasks.appointmentId.
  "appointment_confirmation",
  "appointment_reminder",
  // Client portal (Step 2A) — created when a client uploads a document,
  // and when a client asks to cancel or reschedule an appointment (the
  // portal never changes the appointment itself).
  "document_review",
  "appointment_change_request",
  // Client portal (Step 2B) — the client changed their contact details
  // (the title carries before → after), and the client asked about services.
  "client_info_review",
  "service_interest",
  // Automatic notices (Step 3B) — a notice couldn't go out because the
  // client authorized no channel (or has no phone/email for it).
  "call_client",
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
  // Calendar enhancement, Session 5 — lets appointment_confirmation and
  // appointment_reminder tasks (and Session 4's "Create Follow-Up" button)
  // dedupe per appointment rather than per case: a case can have several
  // appointments, and a caseId-only dedup would wrongly skip a reminder
  // for appointment #2 just because appointment #1's is still open.
  appointmentId: uuid("appointment_id").references(() => appointments.id, {
    onDelete: "set null",
  }),
  // The document a "Review client document" task is about (portal upload),
  // so the task can open it directly.
  documentId: uuid("document_id").references(() => documents.id, {
    onDelete: "set null",
  }),
});

// Notes staff add to a task from its detail panel on /tasks. Append-only.
export const taskNotes = pgTable(
  "task_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdByEmail: text("created_by_email"),
  },
  (table) => [index("task_notes_task_idx").on(table.taskId, table.createdAt)],
);

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

// General, business-wide document folder — distinct from the fine-grained
// immigration-only `folder` above. "immigration" is set automatically
// whenever `folder` is set (i.e. the document also has a fine immigration
// sub-folder); it isn't meant to be picked by hand alongside a manual one.
export const documentCategoryEnum = pgEnum("document_category", [
  "identification",
  "proof_of_address",
  "signed_forms",
  "contracts",
  "payment_receipts",
  "government_correspondence",
  "tax_documents",
  "financial_documents",
  "notarized_documents",
  "immigration",
  "other",
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
  // Lets a document be filed under a referral in the Documents cabinet's
  // "Referidos y Alianzas" drawer even when there's no case yet (or in
  // addition to one) — independent of caseId.
  referralId: uuid("referral_id").references(() => referrals.id, {
    onDelete: "set null",
  }),
  fileName: text("file_name").notNull(),
  blobUrl: text("blob_url").notNull(),
  documentType: text("document_type"),
  status: documentStatusEnum("status"),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  // Phase 5, Session 6 — only set for documents on an Immigration
  // Administrative Services case; null for every other document.
  folder: immigrationDocumentFolderEnum("folder"),
  // Nullable: documents uploaded before this field existed have no category
  // and show up under an "Uncategorized" bucket in the general Documents view.
  category: documentCategoryEnum("category"),
  // Client portal (Step 2A). A staff-uploaded document is only ever shown
  // in the portal once staff explicitly ticks "Visible to client"
  // (default false). A client's own uploads are always visible to that
  // client. sensitiveDataReason is set (never blocking) when a portal
  // upload looks like it contains an SSN/ITIN/card number — clients
  // legitimately send W-2s and immigration forms.
  visibleToClient: boolean("visible_to_client").notNull().default(false),
  uploadedByClient: boolean("uploaded_by_client").notNull().default(false),
  sensitiveDataReason: text("sensitive_data_reason"),
});

// Phase 1 follow-up — a content library for marketing/social assets, kept
// deliberately separate from `documents`: it has no client, isn't
// compliance-sensitive the same way, and is organized by service + publish
// date + channel rather than by who it belongs to.
export const marketingChannelEnum = pgEnum("marketing_channel", [
  "facebook",
  "instagram",
  "tiktok",
  "email",
  "whatsapp",
  "other",
]);

export const marketingContentAssets = pgTable("marketing_content_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Null = general content not tied to one service line.
  serviceType: serviceTypeEnum("service_type"),
  publishedDate: date("published_date"),
  channel: marketingChannelEnum("channel"),
  caption: text("caption"),
  fileName: text("file_name").notNull(),
  blobUrl: text("blob_url").notNull(),
});

// SIDEBAR-PLAN.md sections 4-7 — Social Media: planning, scheduling, and
// publishing preparation, deliberately separate from marketingContentAssets
// (the "Media Library" — raw file storage, kept as-is and referenced here
// via mediaAssetId rather than duplicated) and from Communications (direct
// 1:1 contact history, not public content).
export const socialMediaPlatformEnum = pgEnum("social_media_platform", [
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "linkedin",
  "website",
  "google_business_profile",
  "whatsapp_channel",
  "other",
]);

export const socialContentTypeEnum = pgEnum("social_content_type", [
  "image",
  "video",
  "reel",
  "short",
  "story",
  "carousel",
  "live",
  "educational_post",
  "promotion",
  "testimonial",
  "event",
  "blog",
  "other",
]);

// Section 4's status pipeline.
export const socialContentStatusEnum = pgEnum("social_content_status", [
  "idea",
  "draft",
  "in_review",
  "approved",
  "scheduled",
  "published",
  "archived",
]);

// Section 6 lists "Performance Status" as its own field on the content
// record, separate from the actual view/reach/like counters (which live
// on their own table below, added once real numbers exist to track).
// This tracks only whether that measurement has happened yet.
export const socialPerformanceStatusEnum = pgEnum(
  "social_performance_status",
  ["not_tracked", "tracking", "final"],
);

// Section 7 — Approval & Brand Control. No auto-detection of "does this
// mention RRI/a partner/a testimonial" from free text (too unreliable to
// gate a publish decision on) — approvalRequired is a manual flag staff
// set themselves, with the category list shown as guidance in the UI.
export const socialPartnerApprovalStatusEnum = pgEnum(
  "social_partner_approval_status",
  ["not_required", "pending", "approved", "denied"],
);

export const socialMediaContent = pgTable("social_media_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Friendly "SM-00001" id, same pattern as communicationSeq/referralSeq.
  contentSeq: serial("content_seq").notNull().unique(),
  title: text("title").notNull(),
  platform: socialMediaPlatformEnum("platform").notNull(),
  contentType: socialContentTypeEnum("content_type").notNull(),
  campaign: text("campaign"),
  // Anthony Multiservice LLC and "related approved brands" per section 4 —
  // free text rather than an enum since the approved-brand list isn't
  // modeled anywhere else in this CRM yet.
  brand: text("brand"),
  // Null = general content not tied to one service line, same convention
  // as marketingContentAssets.serviceType.
  serviceType: serviceTypeEnum("service_type"),
  audience: text("audience"),
  language: text("language", { enum: ["en", "es"] }),
  caption: text("caption"),
  hashtags: text("hashtags"),
  callToAction: text("call_to_action"),
  // References the existing Media Library rather than storing another
  // copy of the file.
  mediaAssetId: uuid("media_asset_id").references(
    () => marketingContentAssets.id,
    { onDelete: "set null" },
  ),
  status: socialContentStatusEnum("status").notNull().default("idea"),
  scheduledDate: date("scheduled_date"),
  publishedDate: date("published_date"),
  postUrl: text("post_url"),
  performanceStatus: socialPerformanceStatusEnum("performance_status")
    .notNull()
    .default("not_tracked"),
  approvalRequired: boolean("approval_required").notNull().default(false),
  approvedBy: text("approved_by"),
  approvalDate: date("approval_date"),
  partnerApprovalRequired: boolean("partner_approval_required")
    .notNull()
    .default(false),
  partnerApprovalStatus: socialPartnerApprovalStatusEnum(
    "partner_approval_status",
  )
    .notNull()
    .default("not_required"),
  // Snapshot of the acting session's email, same reasoning as
  // caseStatusHistory.changedByEmail — there's no populated users table yet.
  createdByEmail: text("created_by_email"),
  notes: text("notes"),
});

export const appointments = pgTable("appointments", {
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
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  // Phase 1.5B — B2B Alliances enhancement (closes the gap flagged on
  // serviceColorSettings above: "ahead of whichever future session wires
  // an appointment to a referral/alliance"). Nullable — most
  // appointments are still plain client meetings with no alliance tie.
  allianceId: uuid("alliance_id").references(() => strategicAlliances.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  serviceType: serviceTypeEnum("service_type").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  location: text("location"),
  appointmentType: appointmentTypeEnum("appointment_type")
    .notNull()
    .default("in_person"),
  status: appointmentStatusEnum("status").notNull().default("scheduled"),
  notes: text("notes"),
  // Reserved for the future staff/role system — same unpopulated-until-
  // multi-user-login pattern as cases.assignedUserId (section 13 of
  // CALENDAR-PLAN.md is explicitly deferred until that exists).
  assignedUserId: uuid("assigned_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  referralSource: text("referral_source"),
  documentsNeeded: text("documents_needed"),
  paymentRequired: boolean("payment_required").notNull().default(false),
  paymentStatus: paymentStatusEnum("payment_status"),
  // Snapshot of the acting session's email, same reasoning as
  // caseStatusHistory.changedByEmail — there's no populated users table yet.
  createdByEmail: text("created_by_email"),
  // Set on the NEW appointment created by a reschedule, pointing back at the
  // original (which gets status "rescheduled" and is never deleted — see
  // CALENDAR-PLAN.md section 8). Self-referencing FK — the callback's
  // return type must be annotated AnyPgColumn to avoid a circular type
  // error; every other column keeps its normal inferred type.
  rescheduledFromId: uuid("rescheduled_from_id").references(
    (): AnyPgColumn => appointments.id,
    { onDelete: "set null" },
  ),
  // Calendar enhancement, Session 7 (section 12) — "preparar pero NO
  // activar" future external-calendar sync. Reserved and entirely
  // unpopulated until a real Google Calendar/Outlook/HighLevel
  // Calendar/Zoom/Meet integration exists, same pattern as
  // assignedUserId above. externalCalendarEventId is the dedup key a
  // future sync job would check before creating another external event
  // for the same appointment ("Evitar citas duplicadas al sincronizar").
  externalCalendarProvider: externalCalendarProviderEnum("external_calendar_provider"),
  externalCalendarEventId: text("external_calendar_event_id"),
  externalSyncStatus: integrationSyncStatusEnum("external_sync_status")
    .notNull()
    .default("not_connected"),
  lastExternalSyncAt: timestamp("last_external_sync_at", { withTimezone: true }),
  // Public online booking (/book) — where the appointment came from.
  // Plain text-with-enum (like clients.preferredLanguage) rather than a
  // pgEnum so a future source can be added without an enum migration.
  source: text("source", { enum: ["staff", "online_booking"] })
    .notNull()
    .default("staff"),
  // When the client ticked the privacy/consent checkbox on /book. Only
  // ever set for source = "online_booking".
  onlineBookingConsentAt: timestamp("online_booking_consent_at", {
    withTimezone: true,
  }),
});

// Calendar enhancement, Session 1 (section 4) — one centralized, admin-
// editable color per service, instead of hardcoding colors in the calendar
// component. Keyed by a plain string rather than a hard FK to
// serviceTypeEnum: this covers all 14 real case/appointment service types
// plus 2 categories from CALENDAR-PLAN.md that aren't a serviceType at all
// today — commercial_finance_referral (a referrals.category, not a case
// type) and community_strategic_alliances (its own standalone table, see
// strategicAlliances below) — so Admin can configure their color ahead of
// whichever future session wires an appointment to a referral/alliance.
// "other" is the explicit fallback for anything not covered.
export const serviceColorSettings = pgTable("service_color_settings", {
  key: text("key").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  colorName: text("color_name").notNull(),
  colorHex: text("color_hex").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Standard price list for specific named services (e.g. "Poder notarial",
// "Formulario I-130") — deliberately more granular than serviceType, since
// price varies a lot within a single service_type category. Only prefills
// cases.fee in CaseForm on selection; no FK from cases back to this table,
// so editing/deleting a catalog entry never touches existing cases.
export const serviceCatalogItems = pgTable("service_catalog_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull(),
  serviceType: serviceTypeEnum("service_type").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes"),
});

// Public online booking (/book) — admin-editable availability rules. A
// single row keyed "default"; when it doesn't exist yet, the code-level
// defaults in src/lib/booking/config.ts apply, so no seed step is needed.
// weeklyHours is indexed by JS weekday (0 = Sunday … 6 = Saturday), each
// entry either null (closed) or a single "HH:mm" open/close range in
// America/New_York wall-clock time.
export const onlineBookingSettings = pgTable("online_booking_settings", {
  id: text("id").primaryKey().default("default"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  enabled: boolean("enabled").notNull().default(true),
  weeklyHours: jsonb("weekly_hours")
    .$type<({ start: string; end: string } | null)[]>()
    .notNull(),
  slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(30),
  bufferMinutes: integer("buffer_minutes").notNull().default(15),
  minNoticeMinutes: integer("min_notice_minutes").notNull().default(120),
  maxDaysAhead: integer("max_days_ahead").notNull().default(30),
});

// Which service types the public /book page offers, and how long each
// booked appointment lasts. One row per service type that has ever been
// configured; a missing row falls back to src/lib/booking/config.ts.
export const onlineBookingServices = pgTable("online_booking_services", {
  serviceType: serviceTypeEnum("service_type").primaryKey(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  bookable: boolean("bookable").notNull().default(false),
  durationMinutes: integer("duration_minutes").notNull().default(30),
});

// Whole days the public /book page offers no times at all (vacation,
// holidays). A business-timezone calendar date, not an instant.
export const onlineBookingBlockedDates = pgTable(
  "online_booking_blocked_dates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    date: date("date", { mode: "string" }).notNull(),
    reason: text("reason"),
  },
  (table) => [uniqueIndex("online_booking_blocked_dates_date_idx").on(table.date)],
);

// Durable per-IP / per-phone counter for the public booking endpoint.
// Stores only an HMAC of the IP or phone digits (keyed with AUTH_SECRET),
// never the raw value. Written and counted exclusively inside the
// book_online_appointment() Postgres function (see its migration), under
// the same advisory lock as the slot check.
export const onlineBookingRateLimitEvents = pgTable(
  "online_booking_rate_limit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keyHash: text("key_hash").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("online_booking_rate_limit_events_key_occurred_idx").on(
      table.keyHash,
      table.occurredAt,
    ),
  ],
);

// Client portal (Step 2A) — the personal access links staff generate from
// the client's CRM record and send by WhatsApp. Only a SHA-256 hash of the
// token is stored. A link is single-use (usedAt), expires, can be revoked,
// and locks itself after too many wrong last-4-digit attempts.
export const portalAccessLinks = pgTable(
  "portal_access_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    createdByEmail: text("created_by_email"),
    // HMAC of the phone's last 4 digits when the link was created, so a
    // phone number changed later (e.g. from inside the portal) doesn't
    // change what an outstanding link asks for. Null on links created
    // before Step 2B — those fall back to the client's current phone.
    phoneLast4Hash: text("phone_last4_hash"),
  },
  (table) => [
    uniqueIndex("portal_access_links_token_hash_idx").on(table.tokenHash),
    index("portal_access_links_client_idx").on(table.clientId),
  ],
);

// Client portal sessions — deliberately separate from Auth.js (staff).
// The browser holds a random token in an httpOnly cookie; only its
// SHA-256 hash is stored here. A portal session can never carry a staff
// role: staff Server Actions only accept an Auth.js session.
export const portalSessions = pgTable(
  "portal_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    linkId: uuid("link_id").references(() => portalAccessLinks.id, {
      onDelete: "set null",
    }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("portal_sessions_token_hash_idx").on(table.tokenHash),
    index("portal_sessions_client_idx").on(table.clientId),
  ],
);

// Legal/disclosure texts shown to the public and clients, editable in
// Settings → Legal texts (one row per key). A missing row falls back to
// the code-level default in src/lib/legal/texts.ts. Every final wording
// must be reviewed by a licensed attorney — nothing here is legal advice.
export const legalTexts = pgTable("legal_texts", {
  key: text("key").primaryKey(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  textEn: text("text_en").notNull().default(""),
  textEs: text("text_es").notNull().default(""),
  updatedByEmail: text("updated_by_email"),
});

// Append-only evidence of every acknowledgment/authorization a client (or
// a /book visitor) gives or withdraws: what, when, from which IP/browser,
// and the exact text they saw. Rows are never updated or deleted by the
// app; the current state is the latest row per (client, consentType).
// clientId is set null (not cascade) on client deletion — same reasoning
// as the notary journal: the record must survive, with its name snapshot.
export const clientConsentEvents = pgTable(
  "client_consent_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    clientNameSnapshot: text("client_name_snapshot").notNull(),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    consentType: text("consent_type").notNull(),
    granted: boolean("granted").notNull(),
    // "staff": changed by staff in the CRM (Communication Preferences).
    // "sms_reply": the client texted STOP / BAJA / ALTO (Step 3B).
    source: text("source", { enum: ["portal", "online_booking", "staff", "sms_reply"] }).notNull(),
    textShown: text("text_shown").notNull(),
    // The client's typed name as a simple signature (document-processing
    // authorization only).
    signatureName: text("signature_name"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    // Source "staff" marked from the Authorizations card: who marked it
    // (staff email), how the client gave permission, and an optional note.
    recordedBy: text("recorded_by"),
    staffMethod: text("staff_method", { enum: ["in_person", "phone", "written", "message"] }),
    note: text("note"),
  },
  (table) => [
    index("client_consent_events_client_type_idx").on(
      table.clientId,
      table.consentType,
      table.createdAt,
    ),
  ],
);

// Failed portal sign-in attempts per IP (HMAC of the IP, never the raw
// value), for the brute-force limit on /api/portal/login.
export const portalRateLimitEvents = pgTable(
  "portal_rate_limit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keyHash: text("key_hash").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("portal_rate_limit_events_key_occurred_idx").on(
      table.keyHash,
      table.occurredAt,
    ),
  ],
);

// ── Automatic notices (Step 3B) ──────────────────────────────────────
// Settings → Automatic notices. One row ("default"); a missing row falls
// back to src/lib/notifications/config.ts. testMode sends EVERY client
// notice to the owner's own test phone/email instead of the client.
export const notificationSettings = pgTable("notification_settings", {
  id: text("id").primaryKey().default("default"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedByEmail: text("updated_by_email"),
  enabled: boolean("enabled").notNull().default(true),
  testMode: boolean("test_mode").notNull().default(true),
  testEmail: text("test_email"),
  testPhone: text("test_phone"),
  // Owner alerts (new online booking, client upload, change request).
  ownerAlertEmail: text("owner_alert_email"),
  // Per notice type: { appointment_confirmed: true, … }.
  types: jsonb("types").$type<Record<string, boolean>>().notNull().default({}),
  // true (default; Vercel Pro, notices run every 15 min): 24 h and 2 h
  // reminders. false = one daily run: a day-before reminder only.
  preciseReminders: boolean("precise_reminders").notNull().default(true),
});

// Editable wording per notice / channel / language. A missing row falls
// back to the default text in src/lib/notifications/texts.ts.
export const notificationTexts = pgTable(
  "notification_texts",
  {
    type: text("type").notNull(),
    channel: text("channel", { enum: ["email", "sms"] }).notNull(),
    language: text("language", { enum: ["en", "es"] }).notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedByEmail: text("updated_by_email"),
  },
  (table) => [primaryKey({ columns: [table.type, table.channel, table.language] })],
);

// Every automatic notice, one row each. dedupeKey is UNIQUE, so the same
// notice can never be queued (or sent) twice even if the triggering code
// runs again. body never contains a portal token (replaced by "[link]").
export const notificationOutbox = pgTable(
  "notification_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    dedupeKey: text("dedupe_key").notNull(),
    type: text("type").notNull(),
    audience: text("audience", { enum: ["client", "owner"] }).notNull(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
    // "none" = no authorized channel (a "Call the client" task was created).
    channel: text("channel", { enum: ["email", "sms", "none"] }).notNull(),
    recipient: text("recipient"),
    language: text("language", { enum: ["en", "es"] }).notNull().default("en"),
    subject: text("subject"),
    body: text("body"),
    status: text("status", {
      enum: ["pending", "scheduled", "sending", "sent", "failed", "skipped"],
    }).notNull(),
    // SMS outside 8 AM–8 PM Florida time waits until this instant.
    sendAfter: timestamp("send_after", { withTimezone: true }).notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    testMode: boolean("test_mode").notNull().default(false),
  },
  (table) => [
    uniqueIndex("notification_outbox_dedupe_key_idx").on(table.dedupeKey),
    index("notification_outbox_status_send_after_idx").on(table.status, table.sendAfter),
    index("notification_outbox_client_idx").on(table.clientId),
  ],
);

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

// Document Preparation never got its own pipeline in the original Phase 2
// plan (it predates it) — added on explicit request, modeled on the real
// lifecycle of the apostille work that makes up most of this category:
// documents come in, get sent out for authentication, and come back.
export const documentPrepCaseStatusEnum = pgEnum("document_prep_case_status", [
  "new_request",
  "documents_pending",
  "ready_to_submit",
  "submitted",
  "processing",
  "returned",
  "completed",
  "cancelled",
]);

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
  status: documentPrepCaseStatusEnum("status").notNull().default("new_request"),
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
  // Phase 1.5B — Master Registry architecture. Nullable, same pattern
  // already used by salesTaxCaseDetails/irsCaseDetails/
  // insuranceComplianceDetails: set only through an explicit staff
  // "Create / Link Company" action (never automatically on status
  // change), so the LLC/corp this case forms can become a real
  // Master Organization Registry row without duplicating it as free text.
  companyId: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
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

// Added when Academy became its own sidebar module — "course" itself
// stays free text (no separate course catalog exists or is needed yet),
// but the delivery format is now a structured field so the Academy list
// can show/filter it.
// Phase 2C — "hybrid" appended (Postgres enums only support adding
// values, never renaming/removing — see AGENTS.md); the three original
// values are untouched for existing rows. Shared as-is by the new
// academy_courses.format column below, since it's the same underlying
// concept (how a course/enrollment is delivered), not a second enum.
export const courseFormatEnum = pgEnum("course_format", [
  "live",
  "in_person",
  "recorded",
  "hybrid",
]);

// Phase 2C — Academy Course & Program Catalog. Additive, backward-compatible
// structured catalog sitting alongside academy_enrollment_details' existing
// free-text program/course columns (which are kept, untouched, forever —
// historical enrollments display them as-is). A program groups courses; a
// course may stand alone (programId nullable) or belong to a program;
// modules belong to exactly one course. None of these three tables are ever
// hard-deleted through the UI — status (draft/active/archived) is how staff
// retire a catalog entry while preserving history and any enrollments that
// still reference it.
export const academyCatalogStatusEnum = pgEnum("academy_catalog_status", [
  "draft",
  "active",
  "archived",
]);

export const academyPrograms = pgTable("academy_programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull(),
  description: text("description"),
  status: academyCatalogStatusEnum("status").notNull().default("draft"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  durationText: text("duration_text"),
  certificateEligible: boolean("certificate_eligible").notNull().default(false),
  notes: text("notes"),
});

export const academyCourses = pgTable("academy_courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Nullable — a course may stand alone without belonging to any program
  // (explicitly allowed per the Phase 2C spec).
  programId: uuid("program_id").references(() => academyPrograms.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  description: text("description"),
  format: courseFormatEnum("format").notNull().default("live"),
  status: academyCatalogStatusEnum("status").notNull().default("draft"),
  durationText: text("duration_text"),
  // Catalog/informational only in Phase 2C — never read by invoice or
  // payment logic. See AGENTS.md: invoice totals are always recomputed
  // server-side from line items, never from a field like this one.
  price: numeric("price", { precision: 10, scale: 2 }),
  certificateEligible: boolean("certificate_eligible").notNull().default(false),
  // One optional primary instructor per course in this phase — see the
  // comment on academy_instructors; this is a link to that identity-aware
  // table, never a duplicated name/contact field.
  primaryInstructorId: uuid("primary_instructor_id").references(
    () => academyInstructors.id,
    { onDelete: "set null" },
  ),
  notes: text("notes"),
  // Phase 2E — optional completion/readiness requirements, additive and
  // nullable/false by default so existing courses keep working unchanged
  // ("Defaults should not retroactively impose requirements"). Read only by
  // the completion-readiness summary on the enrollment detail page — never
  // enforced automatically and never used to auto-issue a certificate
  // (that's a later phase). Null numeric fields display as "Not configured".
  minimumAttendancePercentage: integer("minimum_attendance_percentage"),
  minimumOverallGrade: integer("minimum_overall_grade"),
  requireAllActiveModulesCompleted: boolean("require_all_active_modules_completed")
    .notNull()
    .default(false),
  requireAllEvaluationsGraded: boolean("require_all_evaluations_graded")
    .notNull()
    .default(false),
});

export const academyCourseModules = pgTable("academy_course_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Modules have no meaning independent of their course, so cascade here
  // (unlike the "set null" used for optional cross-entity links above) —
  // same reasoning as invoice_line_items -> invoices. Courses are never
  // hard-deleted through the UI, so this only matters for direct DB
  // administration, never a normal staff action.
  courseId: uuid("course_id")
    .notNull()
    .references(() => academyCourses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  moduleOrder: integer("module_order").notNull().default(0),
  durationText: text("duration_text"),
  status: academyCatalogStatusEnum("status").notNull().default("draft"),
});

export const academyEnrollmentDetails = pgTable("academy_enrollment_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  // Free-text originals — kept forever, never deleted or blanked by the
  // catalog below. Historical enrollments with no programId/courseId
  // continue to display these exactly as before.
  program: text("program"),
  course: text("course"),
  // Phase 2C — additive structured links, nullable. When staff pick a
  // catalog Program/Course on a new or edited enrollment, the form also
  // mirrors the chosen names into the free-text program/course columns
  // above (see CaseForm.tsx), so every existing read path (the Academy
  // list, the case detail page) keeps working unchanged for both old and
  // new enrollments without needing its own catalog join.
  programId: uuid("program_id").references(() => academyPrograms.id, {
    onDelete: "set null",
  }),
  courseId: uuid("course_id").references(() => academyCourses.id, {
    onDelete: "set null",
  }),
  courseFormat: courseFormatEnum("course_format"),
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

// Phase 2D — per-student, per-module progress tracking for catalog-linked
// enrollments. Deliberately NOT a duplicate enrollment system: this just
// attaches tracking rows to the existing academy_enrollment_details row via
// its own primary key (caseId) — see "COURSE ENROLLMENT RELATIONSHIP" in the
// Phase 2D spec. The module catalog (academy_course_modules) stays the only
// source of truth for a course's module structure; this table only ever
// records a status per (enrollment, module) pair, never a copy of the
// module's own title/order/etc.
//
// Progress percentage is intentionally never stored here or on
// academy_enrollment_details — it's always computed live from "how many of
// the course's currently-ACTIVE modules have a completed row here", so a
// later-added module changes the denominator automatically and a later-
// archived module drops out of it automatically, with no invalidation logic
// needed (see listCourseModuleProgress in academyProgress.ts queries). A
// progress row for an since-archived module is never deleted — it just
// stops counting toward the live percentage, per the "don't delete history"
// instruction.
//
// courseId is denormalized from the module's own courseId (safe: a module
// never moves between courses) purely so this table can be queried directly
// by course without a join through academy_course_modules. clientId is
// denormalized from the enrollment's case for the same reason — safe
// cross-course querying of "this student's progress everywhere" without
// joining through cases.
export const academyModuleProgressStatusEnum = pgEnum("academy_module_progress_status", [
  "not_started",
  "in_progress",
  "completed",
]);

export const academyStudentModuleProgress = pgTable(
  "academy_student_module_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    enrollmentCaseId: uuid("enrollment_case_id")
      .notNull()
      .references(() => academyEnrollmentDetails.caseId, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => academyCourses.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => academyCourseModules.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    status: academyModuleProgressStatusEnum("status").notNull().default("not_started"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
  },
  (table) => [
    // One progress row per (enrollment, module) — the UI upserts into this,
    // never inserts a second row for the same module.
    uniqueIndex("academy_student_module_progress_enrollment_module_idx").on(
      table.enrollmentCaseId,
      table.moduleId,
    ),
  ],
);

// Phase 2D — a real attendance log (sessions + per-student records), not a
// single percentage column. academy_attendance_sessions is one row per
// class/live session held for a course; academy_attendance_records is one
// row per (session, enrollment) marking that student's status for that
// session. Attendance percentage is likewise never stored — always computed
// live from these records (see getAttendanceSummary in academyProgress.ts
// queries), using the rule documented there: Present and Late count as
// attended, Absent counts as not attended, Excused is excluded from the
// denominator entirely.
export const academyAttendanceStatusEnum = pgEnum("academy_attendance_status", [
  "present",
  "absent",
  "excused",
  "late",
]);

export const academyAttendanceSessions = pgTable("academy_attendance_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => academyCourses.id, { onDelete: "cascade" }),
  sessionDate: date("session_date").notNull(),
  title: text("title"),
  notes: text("notes"),
});

export const academyAttendanceRecords = pgTable(
  "academy_attendance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => academyAttendanceSessions.id, { onDelete: "cascade" }),
    enrollmentCaseId: uuid("enrollment_case_id")
      .notNull()
      .references(() => academyEnrollmentDetails.caseId, { onDelete: "cascade" }),
    attendanceStatus: academyAttendanceStatusEnum("attendance_status").notNull(),
    notes: text("notes"),
    markedAt: timestamp("marked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One attendance record per (session, enrollment) — marking again
    // updates the existing row instead of creating a duplicate.
    uniqueIndex("academy_attendance_records_session_enrollment_idx").on(
      table.sessionId,
      table.enrollmentCaseId,
    ),
  ],
);

// Phase 2E — structured evaluations (quizzes, exams, assignments, etc.) and
// per-student results. An evaluation belongs to a Course, and optionally to
// one of that course's Modules; it never duplicates Course/Module data,
// only references it. moduleId is "set null" (not cascade) specifically so
// archiving/removing a module's reference never deletes the evaluation or
// its historical results — see "MODULE ARCHIVING" in the Phase 2E spec.
// status reuses academyCatalogStatusEnum (draft|active|archived) — same
// lifecycle semantics as courses/modules, no hard-delete UI.
//
// percentageScore is deliberately never stored on results — always computed
// live as pointsEarned / evaluation.maxPoints × 100, same "never store a
// derived percentage" principle used throughout academyProgress.ts and
// academyAttendance.ts in Phase 2D.
export const academyEvaluationTypeEnum = pgEnum("academy_evaluation_type", [
  "quiz",
  "exam",
  "assignment",
  "practical",
  "final_evaluation",
  "other",
]);

export const academyEvaluationResultStatusEnum = pgEnum("academy_evaluation_result_status", [
  "not_submitted",
  "submitted",
  "graded",
  "excused",
]);

export const academyEvaluations = pgTable("academy_evaluations", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => academyCourses.id, { onDelete: "cascade" }),
  moduleId: uuid("module_id").references(() => academyCourseModules.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  evaluationType: academyEvaluationTypeEnum("evaluation_type").notNull().default("other"),
  maxPoints: integer("max_points").notNull(),
  // Percentage threshold (0-100), not a raw point value — compared against
  // the computed percentageScore to derive Passed/Not Passed.
  passingScore: integer("passing_score"),
  weightPercentage: integer("weight_percentage"),
  status: academyCatalogStatusEnum("status").notNull().default("draft"),
  dueDate: date("due_date"),
  notes: text("notes"),
});

export const academyEvaluationResults = pgTable(
  "academy_evaluation_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => academyEvaluations.id, { onDelete: "cascade" }),
    enrollmentCaseId: uuid("enrollment_case_id")
      .notNull()
      .references(() => academyEnrollmentDetails.caseId, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    // Guarded at the application layer (never negative, never above the
    // evaluation's maxPoints) — see academyEvaluationResult.ts validation.
    pointsEarned: integer("points_earned"),
    status: academyEvaluationResultStatusEnum("status").notNull().default("not_submitted"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    notes: text("notes"),
    feedback: text("feedback"),
  },
  (table) => [
    // One result per (evaluation, enrollment) — grading again updates the
    // existing row instead of creating a duplicate.
    uniqueIndex("academy_evaluation_results_evaluation_enrollment_idx").on(
      table.evaluationId,
      table.enrollmentCaseId,
    ),
  ],
);

// Phase 2F — Academy Certificates. A certificate is a historical document,
// never auto-issued: issuance is always one explicit admin action (see
// issueCertificate in queries/academyCertificates.ts), gated by the Phase
// 2E course requirements (minimumAttendancePercentage/minimumOverallGrade/
// requireAllActiveModulesCompleted/requireAllEvaluationsGraded) and the
// course's own certificateEligible flag — none of which this table
// duplicates, only reads at issuance time.
//
// enrollmentCaseId anchors every certificate (same convention as progress/
// attendance/evaluation results above); courseId/programId are nullable
// because a certificate must also work for a historical free-text
// enrollment that has no catalog course at all — see studentNameSnapshot/
// courseNameSnapshot/programNameSnapshot below, which freeze the display
// text at issuance time (same "frozen snapshot" pattern as
// notaryLogEntries.clientNameSnapshot) so a certificate never changes
// retroactively if the client is renamed or the catalog course is edited
// or archived later.
//
// "draft" is a supported status (issuance could become a two-step flow in
// a future session) but the current single-step issuance flow only ever
// produces "issued" rows directly. Revoking never deletes the row — see
// revokedAt/revokedReason below — so certificate history is permanent.
export const academyCertificateStatusEnum = pgEnum("academy_certificate_status", [
  "draft",
  "issued",
  "revoked",
]);

export const academyCertificates = pgTable("academy_certificates", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Server-generated, race-condition-proof sequence — same convention as
  // invoices.invoiceSeq / ai_escalations.escalationSeq: the display
  // certificate number (e.g. "AMS-CERT-2026-00001") is formatted from this
  // at read time (see formatCertificateNumber in queries/
  // academyCertificates.ts), never stored as its own column, so it can
  // never drift from the one true unique sequence value.
  certificateSeq: serial("certificate_seq").notNull().unique(),
  enrollmentCaseId: uuid("enrollment_case_id")
    .notNull()
    .references(() => academyEnrollmentDetails.caseId, { onDelete: "cascade" }),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").references(() => academyCourses.id, {
    onDelete: "set null",
  }),
  programId: uuid("program_id").references(() => academyPrograms.id, {
    onDelete: "set null",
  }),
  studentNameSnapshot: text("student_name_snapshot").notNull(),
  courseNameSnapshot: text("course_name_snapshot").notNull(),
  programNameSnapshot: text("program_name_snapshot"),
  status: academyCertificateStatusEnum("status").notNull().default("issued"),
  issueDate: date("issue_date").notNull(),
  completionDate: date("completion_date"),
  // Free text, not a FK to users — the authenticated admin's display name/
  // email at issuance time, editable before confirming (see
  // IssueCertificateDialog), never fabricated.
  issuedBy: text("issued_by").notNull(),
  notes: text("notes"),
  // Section "ISSUANCE" — an explicit, recorded override when a certificate
  // is issued despite Not Eligible / Requirements Not Configured. Never
  // inferred; always a deliberate admin choice with a reason.
  overrideUsed: boolean("override_used").notNull().default(false),
  overrideReason: text("override_reason"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedReason: text("revoked_reason"),
});

// Academy's Diamond Community — a VIP WhatsApp space (admin + students +
// teachers) that exists entirely outside the CRM; this table is only a
// membership roster (who's in it, since when, what status), never a
// message log. Deliberately not built on conversationMessages: that
// table is a 1:1 client<->business log, and a group with several
// simultaneous participants doesn't fit a single clientId per row.
// Students link to their existing client/case (no duplicated contact
// info); teachers aren't clients or staff accounts, so they get their
// own name/phone/email here, same pattern as strategicAlliances'
// free-text relationshipOwner/contactPerson.
// Phase 1.5B — Master Registry architecture additively extends this
// with "instructor"/"mentor"/"mentee" alongside the original
// "student"/"teacher" (never renamed, existing rows untouched) so
// Diamond's roles can reflect the Academy's actual vocabulary without
// overloading "teacher" for every non-student participant.
export const diamondMemberTypeEnum = pgEnum("diamond_member_type", [
  "student",
  "teacher",
  "instructor",
  "mentor",
  "mentee",
]);

export const diamondMemberStatusEnum = pgEnum("diamond_member_status", [
  "active",
  "paused",
  "removed",
]);

export const academyDiamondMembers = pgTable("academy_diamond_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  memberType: diamondMemberTypeEnum("member_type").notNull(),
  // Set for memberType "student" — the roster joins clients/cases for
  // name and program instead of duplicating them.
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  // Set for the non-student member types (teacher/instructor/mentor/
  // mentee), who usually have no client or staff record — name/phone/
  // email stay the free-text fallback.
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  // Phase 1.5B — optional link for the case where a non-student member
  // (e.g. a graduate who becomes a mentor) already has a clients row —
  // lets staff reuse that identity instead of retyping it as free text.
  // Nullable; the free-text fields above remain the fallback when unset.
  teacherClientId: uuid("teacher_client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  joinedDate: date("joined_date").notNull().defaultNow(),
  status: diamondMemberStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
});

// Phase 2B — Academy Instructors & Mentors. Deliberately NOT a second person
// table: clientId is an optional link back to the one master identity
// (clients), same "link if known, free-text fallback if not" pattern as
// academyDiamondMembers.teacherClientId above. name/email/phone are always
// stored on the row itself (never pulled from the linked client) since an
// instructor's work contact details can differ from their personal client
// record — same reasoning as academyDiamondMembers' own phone/email fields.
// Deliberately separate from academyDiamondMembers: a person can be an
// Academy Instructor, a Diamond Community member, or both — this table is
// never read by or merged into the Diamond roster.
export const academyRoleStatusEnum = pgEnum("academy_role_status", [
  "active",
  "paused",
  "inactive",
]);

export const academyInstructors = pgTable("academy_instructors", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Optional link to the master person identity (clients). Nullable: a
  // name-only fallback is used until/unless staff link an existing client.
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  // Free-text fallback display name — only required when clientId is unset
  // (enforced in the Zod schema, not here, same as academyDiamondMembers).
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  specialty: text("specialty"),
  bio: text("bio"),
  startDate: date("start_date"),
  status: academyRoleStatusEnum("status").notNull().default("active"),
});

export const academyMentors = pgTable("academy_mentors", {
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
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  focusArea: text("focus_area"),
  notes: text("notes"),
  startDate: date("start_date"),
  status: academyRoleStatusEnum("status").notNull().default("active"),
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
  // Phase 5, Session 8 — Data Freshness (spec section 18).
  verifiedBy: text("verified_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Reference data backing the National Notary State Guide (Academy module).
// Real, verified 50-state data sourced only from official .gov/state-agency
// domains — see scripts/seed-notary-state-guide.ts. A missing link field
// renders as "Not found" in the UI and a missing examLink renders the
// literal "No separate state notary examination listed by the state."
// string; neither is ever backfilled with a private/commercial source.
export const notaryStateGuideStatusEnum = pgEnum("notary_state_guide_status", [
  "verified",
  "needs_review",
  "unavailable",
]);

export const notaryStateGuide = pgTable("notary_state_guide", {
  state: text("state").primaryKey(), // 2-letter USPS abbreviation
  officialAgency: text("official_agency"),
  officialWebsite: text("official_website"),
  commissionLink: text("commission_link"),
  examLink: text("exam_link"),
  requirementsLink: text("requirements_link"),
  sourceUrl: text("source_url"),
  status: notaryStateGuideStatusEnum("status").notNull().default("needs_review"),
  lastVerifiedDate: date("last_verified_date"),
  verifiedBy: text("verified_by"),
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

// Insurance & Compliance — Workers Comp, Liability Insurance, Payroll,
// HIPAA Compliance, and general Insurance, one service type with a subType
// (see irsCaseTypeEnum above for the same pattern). "Expiring soon" is
// deliberately not a stored status — it's computed from expirationDate vs.
// today wherever it's displayed, so it can never drift out of sync; the
// renewal-check cron reads the same computation to create a task.
export const insuranceComplianceTypeEnum = pgEnum("insurance_compliance_type", [
  "workers_comp",
  "liability_insurance",
  "payroll",
  "hipaa_compliance",
  "general_insurance",
  "other",
]);

export const insuranceComplianceStatusEnum = pgEnum("insurance_compliance_status", [
  "not_started",
  "in_progress",
  "active",
  "expired",
  "renewed",
  "cancelled",
]);

export const insuranceComplianceDetails = pgTable("insurance_compliance_details", {
  caseId: uuid("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  subType: insuranceComplianceTypeEnum("sub_type").notNull().default("general_insurance"),
  provider: text("provider"),
  policyOrAccountNumber: text("policy_or_account_number"),
  coverageAmount: numeric("coverage_amount", { precision: 12, scale: 2 }),
  premiumAmount: numeric("premium_amount", { precision: 12, scale: 2 }),
  effectiveDate: date("effective_date"),
  expirationDate: date("expiration_date"),
  renewalReminderDays: integer("renewal_reminder_days").notNull().default(30),
  status: insuranceComplianceStatusEnum("status").notNull().default("not_started"),
  lastRenewedDate: date("last_renewed_date"),
  complianceNotes: text("compliance_notes"),
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
  verifiedBy: text("verified_by"),
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
  verifiedBy: text("verified_by"),
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
  // Phase 1.5B — same optional linking pattern added to strategicAlliances:
  // contactPerson stays the free-text fallback; contactClientId is set
  // only when staff explicitly link to an existing clients row.
  contactClientId: uuid("contact_client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  // Phase 1.5B — optional link to the Master Organization Registry
  // (companies), same reasoning as strategicAlliances.companyId.
  companyId: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
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
  // Phase 5, Session 8 — Data Freshness (spec section 18). Added
  // retroactively to this Session 7 table since the spec explicitly
  // includes "associations" in the freshness-tracking list.
  lastVerifiedDate: date("last_verified_date"),
  verifiedBy: text("verified_by"),
  active: boolean("active").notNull().default(true),
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
    // Phase 5, Session 8 — Data Freshness (spec section 18).
    // sourceLastUpdated above already serves as this row's "Last Verified
    // Date".
    verifiedBy: text("verified_by"),
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
  // SIDEBAR-PLAN.md section 2 — completing Communications' "connects to"
  // list (Client, Company, Service, Referral, Task, Appointment, Partner,
  // Assigned User). Two separate nullable FKs for alliances/associations
  // rather than one generic "partner" column, mirroring why those are two
  // separate tables in the first place (see associationsChambers above).
  appointmentId: uuid("appointment_id").references(() => appointments.id, {
    onDelete: "set null",
  }),
  allianceId: uuid("alliance_id").references(() => strategicAlliances.id, {
    onDelete: "set null",
  }),
  associationId: uuid("association_id").references(
    () => associationsChambers.id,
    { onDelete: "set null" },
  ),
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

// Referral direction — which way the introduction flowed. Nullable and
// never backfilled for existing referrals (there's no reliable way to
// infer this from history); staff assign it going forward.
export const referralDirectionEnum = pgEnum("referral_direction", [
  "ams_to_rri",
  "rri_to_ams",
  "ams_to_other_partner",
  "other_partner_to_ams",
  "b2b",
  "community",
  "strategic_alliance",
]);

// The single, general referral pipeline — generalized from what was
// rri_status (Commercial Finance/RRI only) below, now the fine-grained
// status for every referral regardless of category. `referrals.status`
// (the coarse submitted/in_progress/closed_won/closed_lost above) is kept
// and derived from this, same coarse+fine pattern as cases.status vs.
// e.g. taxCaseStatusEnum.
export const referralPipelineStatusEnum = pgEnum("referral_pipeline_status", [
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
  // Optional link to the Strategic Alliances record this referral actually
  // came from — `originatingBusiness` stays free text for referrals with no
  // formal alliance on file.
  allianceId: uuid("alliance_id").references(() => strategicAlliances.id, {
    onDelete: "set null",
  }),
  // Referrals & Commissions Foundation — the second of three referrer-type
  // signals (alongside allianceId above and referredBy below), for the
  // "Existing Client/Member" referrer type (spec section 3). Nullable and
  // independent of clientId above, which is always the REFERRED client,
  // never the referrer — a person can be both on different referrals, but
  // never conflated on the same one. When neither allianceId nor
  // referrerClientId is set, referredBy (free text) is the "Other
  // Authorized Referrer" — the referrer type is inferred from which of
  // these is populated, not stored as a separate redundant enum.
  referrerClientId: uuid("referrer_client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  originatingBusiness: text("originating_business"),
  referredBy: text("referred_by").notNull(),
  receivingParty: text("receiving_party").notNull(),
  direction: referralDirectionEnum("direction"),
  pipelineStatus: referralPipelineStatusEnum("pipeline_status")
    .notNull()
    .default("new_referral"),
  status: referralStatusEnum("status").notNull().default("submitted"),
  closedDate: date("closed_date"),
  // Referrals & Commissions Foundation, audit section C — these 9 legacy
  // fields (through paymentConfirmation below) predate this phase and are
  // preserved EXACTLY as-is, including their original behavior: staff
  // still type a gross revenue and percentage by hand here and the
  // commission is still auto-computed on save (see actions.ts
  // computeRevenue) with no earning trigger, no approval step, and no
  // link to real Invoice/Payment data — this was always a manual
  // calculator, never a reconciled figure. New referrals should prefer
  // the structured referralCompensations/referralCompensationPayments
  // model below (explicit terms, earning trigger, approval, and
  // multi-payment history) instead of these fields, but nothing here was
  // renamed, dropped, or silently reinterpreted — existing data (e.g.
  // RRI referrals) keeps displaying exactly as it always has.
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

// ===================================================================
// Referrals & Commissions Foundation — the structured compensation
// model, additive alongside (never replacing) the legacy
// grossRevenue/commissionPercentage/commissionDue/etc. fields on
// referrals above. Deliberately separate from referralStatusHistory
// (referral lifecycle) and from the legacy fields (a flat, no-workflow
// manual calculator) — see spec section 10: referral status and
// compensation status are different concepts and must not be collapsed.
//
// "Compensation exists only when an explicit human-confirmed
// compensation arrangement applies" — so no row here is auto-created
// for a referral; staff explicitly set terms via "Set Compensation
// Terms" on the referral detail page. A referral with no row here has
// no structured compensation arrangement (which is the default/normal
// case — most referrals carry no commission at all).
export const compensationTypeEnum = pgEnum("compensation_type", [
  "none",
  "percentage",
  "fixed",
  "custom",
]);

// Spec section 8 — compensation must not become "Earned" merely because
// a referral record exists. The configured trigger is always explicit;
// "manual_confirmation" exists precisely for when no other reliable
// automatic event exists, rather than the CRM pretending to know money
// was collected.
export const compensationEarningTriggerEnum = pgEnum(
  "compensation_earning_trigger",
  [
    "client_signed",
    "deposit_received",
    "full_payment_received",
    "manual_confirmation",
    "other",
  ],
);

// Spec section 9 — partial-payment behavior is explicit per arrangement,
// never a universal rule the CRM invents.
export const compensationPartialPaymentRuleEnum = pgEnum(
  "compensation_partial_payment_rule",
  ["proportional", "full_payment_only", "manual"],
);

// Spec section 10 — Earned does not mean Approved; Approved does not
// mean Paid. "paid" is reached only once recorded, non-reversed
// payments (referralCompensationPayments below) sum to at least
// approvedAmount — derived from human-entered payment records, never
// claimed as bank-reconciled (spec section AB/12).
export const compensationStatusEnum = pgEnum("compensation_status", [
  "not_earned",
  "earned",
  "approved",
  "paid",
]);

export const referralCompensations = pgTable("referral_compensations", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // One compensation arrangement per referral in this phase — a referral
  // being renegotiated gets its existing row updated (which is itself
  // audited via audit_log), not a second competing row.
  referralId: uuid("referral_id")
    .notNull()
    .unique()
    .references(() => referrals.id, { onDelete: "cascade" }),
  compensationType: compensationTypeEnum("compensation_type")
    .notNull()
    .default("none"),
  percentageRate: numeric("percentage_rate", { precision: 5, scale: 2 }),
  fixedAmount: numeric("fixed_amount", { precision: 12, scale: 2 }),
  // Spec section 6 — always human-confirmed, never auto-summed from
  // Invoices/Payments. baseDescription is the human-readable explanation
  // of what this dollar figure represents (e.g. "AMS service fee only,
  // excludes the $85 apostille pass-through cost").
  eligibleBaseAmount: numeric("eligible_base_amount", {
    precision: 12,
    scale: 2,
  }),
  baseDescription: text("base_description"),
  earningTrigger: compensationEarningTriggerEnum("earning_trigger"),
  earningTriggerNotes: text("earning_trigger_notes"),
  partialPaymentRule: compensationPartialPaymentRuleEnum(
    "partial_payment_rule",
  ),
  // Optional human-selected reference to the alliance's existing
  // agreement/addendum — never a duplicate copy, never auto-parsed (spec
  // section 21).
  agreementDocumentId: uuid("agreement_document_id").references(
    () => allianceDocuments.id,
    { onDelete: "set null" },
  ),
  status: compensationStatusEnum("status").notNull().default("not_earned"),
  earnedAt: timestamp("earned_at", { withTimezone: true }),
  earnedByEmail: text("earned_by_email"),
  earnedNotes: text("earned_notes"),
  // approvedAmount is independent of eligibleBaseAmount/percentageRate/
  // fixedAmount — a human approves an actual dollar figure, which may
  // differ from the computed suggestion (spec section 11).
  approvedAmount: numeric("approved_amount", { precision: 12, scale: 2 }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedByEmail: text("approved_by_email"),
  approvalNotes: text("approval_notes"),
  notes: text("notes"),
  createdByEmail: text("created_by_email"),
});

// Spec sections 9/12/31 — one-to-many so partial payments are each their
// own record (summed to derive "paid" status above) and so a mistaken
// entry can be reversed (traceable correction) rather than deleted,
// preserving financial history per spec section 30/31.
export const referralCompensationPayments = pgTable(
  "referral_compensation_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    referralCompensationId: uuid("referral_compensation_id")
      .notNull()
      .references(() => referralCompensations.id, { onDelete: "cascade" }),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull(),
    paymentDate: date("payment_date").notNull(),
    paymentMethod: text("payment_method"),
    paymentReference: text("payment_reference"),
    notes: text("notes"),
    recordedByEmail: text("recorded_by_email"),
    // Spec section 31 — a correction never deletes the row; it marks the
    // row reversed and keeps why/when/who, so the record that something
    // was entered (and then corrected) is never lost.
    reversed: boolean("reversed").notNull().default(false),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    reversedByEmail: text("reversed_by_email"),
    reversalReason: text("reversal_reason"),
  },
);

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
  // Deprecated: superseded by referrals.pipelineStatus, which now applies
  // to every referral, not just Commercial Finance/RRI ones. Column and
  // enum kept (not dropped) so no historical data is lost; new code
  // reads/writes referrals.pipelineStatus instead.
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
  // SIDEBAR-PLAN.md section 3 — added when the Community & Strategic
  // Alliances module was completed; the original 12 values above predate
  // this and are kept as-is for existing rows.
  "business_association",
  "latino_association",
  "referral_partner",
  "training_partner",
  "university",
  "business_organization",
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
  // SIDEBAR-PLAN.md section 3 — associationsChambers' own pipeline
  // already had "member"; alliances' pipeline didn't.
  "member",
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
  // Phase 1.5B — Master Registry architecture. Nullable; contactPerson
  // (free text) stays as the display fallback for alliances with no
  // matching CRM contact on file yet. Set only when staff explicitly
  // link this alliance's contact to an existing clients row (no
  // dedupe/backfill performed automatically).
  contactClientId: uuid("contact_client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  // Phase 1.5B — optional link to the Master Organization Registry
  // (companies) when this alliance partner is also a formally
  // registered business AMS has a company record for. Null for
  // alliances with no formal company on file (a church, an individual
  // professional, etc.) — exactly as today.
  companyId: uuid("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  organizationType: organizationTypeEnum("organization_type"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  relationshipOwner: text("relationship_owner"),
  dateIntroduced: date("date_introduced"),
  // Phase 1.5B — B2B Alliances enhancement. agreementStartDate/
  // agreementRenewalDate are deliberately separate from dateIntroduced
  // above: "introduced" is first contact, these two track the actual
  // agreement's lifecycle. Neither reinterprets nor is backfilled from
  // dateIntroduced on existing rows.
  agreementStartDate: date("agreement_start_date"),
  agreementRenewalDate: date("agreement_renewal_date"),
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
  // Phase 1.5B — B2B Alliances enhancement. Kept as two separate fields
  // on purpose, never merged into one "responsibilities" blob: staff
  // need to see at a glance what AMS committed to vs. what the partner
  // committed to.
  amsResponsibilities: text("ams_responsibilities"),
  partnerResponsibilities: text("partner_responsibilities"),
});

// Phase 1.5B — B2B Alliances enhancement. One alliance can have several
// contacts (Primary Contact, Owner, Billing Contact, Referral Contact,
// or a custom role) — this was previously flattened onto a single
// contactPerson/contactClientId pair on strategicAlliances itself,
// which both remain untouched as a backward-compatible display
// fallback for alliances that predate this table. Same shape/reasoning
// as company_contacts: clientId is optional (a B2B contact is not
// automatically a service client), name is always required so a
// contact with no clients row still displays correctly.
export const allianceContacts = pgTable("alliance_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  allianceId: uuid("alliance_id")
    .notNull()
    .references(() => strategicAlliances.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  role: text("role"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
});

// Phase 1.5B — B2B Alliances enhancement. Nullable on purpose: existing
// uploaded documents (e.g. RRI Financial Group's signed addendum) have
// no type until staff manually classify them — never auto-assigned to
// "other" just to have a value.
export const allianceDocumentTypeEnum = pgEnum("alliance_document_type", [
  "contract",
  "addendum",
  "supporting_document",
  "other",
]);

// Phase 1 follow-up — files tied to the partnership itself (the signed
// referral/commission agreement, etc.), not to any one client. Kept
// separate from `documents` because that table requires a clientId, which
// an alliance-level contract doesn't have.
export const allianceDocuments = pgTable("alliance_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  allianceId: uuid("alliance_id")
    .notNull()
    .references(() => strategicAlliances.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  blobUrl: text("blob_url").notNull(),
  documentType: allianceDocumentTypeEnum("document_type"),
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

// B2B Network Foundation — records that one B2B Alliance introduced/
// recommended another. This is NETWORK PROVENANCE ONLY: it deliberately
// has no amount, percentage, or payment field, and nothing anywhere reads
// this table to calculate a commission, invoice, payment, membership, or
// portal grant. Financial compensation always comes from an explicit
// referral/agreement (the existing referrals.commission* fields on the
// actual referral row, or a future compensation-agreement phase) — never
// inferred from the mere fact that one alliance introduced another.
// Cascade-deletes with either alliance (there is no reason to keep a
// provenance row once one side of it no longer exists), unlike the
// compliance-grade notary journal pattern elsewhere in this file.
export const allianceNetworkRelationships = pgTable(
  "alliance_network_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    referringAllianceId: uuid("referring_alliance_id")
      .notNull()
      .references(() => strategicAlliances.id, { onDelete: "cascade" }),
    introducedAllianceId: uuid("introduced_alliance_id")
      .notNull()
      .references(() => strategicAlliances.id, { onDelete: "cascade" }),
    relationshipDate: date("relationship_date"),
    notes: text("notes"),
    // Snapshot of the acting session's email at the time this was recorded
    // — same pattern as allianceStatusHistory.changedByEmail — this is who
    // recorded the relationship, not an external approval workflow.
    recordedByEmail: text("recorded_by_email"),
  },
  (table) => [
    // Prevents recording the exact same directional introduction twice.
    // Self-links (referring === introduced) are rejected at the
    // application layer (src/lib/validation/allianceNetwork.ts), not here.
    uniqueIndex("alliance_network_relationships_unique_pair").on(
      table.referringAllianceId,
      table.introducedAllianceId,
    ),
  ],
);

// ===================================================================
// B2B Memberships & Benefits — extends the existing B2B Alliance
// architecture rather than duplicating it. The core distinction this
// whole block preserves: a strategicAlliances row (the business
// relationship itself) is NOT a membership. An alliance may remain
// Active with zero membership relationship forever — membership is
// optional and always a separate, explicit record a human creates.
// Nothing here is ever created automatically from an alliance's
// existence, status, or network connections.

export const membershipBillingModelEnum = pgEnum("membership_billing_model", [
  "free",
  "paid",
  "custom",
]);

export const membershipBillingFrequencyEnum = pgEnum(
  "membership_billing_frequency",
  ["monthly", "annual", "one_time", "custom"],
);

// Internal configurable catalog of plans AMS can offer — deliberately
// no hardcoded "Basic/Professional/Premium" names; real plans are
// staff-defined data, not schema. price/billingFrequency here are the
// plan's CURRENT terms; an existing alliance's membership snapshots its
// own agreed price/frequency at assignment time (see allianceMemberships
// below), so editing a plan's price later never rewrites what an
// existing member already agreed to pay — same snapshot principle as
// the Referrals & Commissions compensation terms.
export const membershipPlans = pgTable("membership_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull(),
  description: text("description"),
  billingModel: membershipBillingModelEnum("billing_model")
    .notNull()
    .default("free"),
  price: numeric("price", { precision: 12, scale: 2 }),
  billingFrequency: membershipBillingFrequencyEnum("billing_frequency"),
  currency: text("currency").notNull().default("USD"),
  benefitsSummary: text("benefits_summary"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdByEmail: text("created_by_email"),
});

// Reusable benefit catalog — a benefit is defined once here and attached
// to any number of plans via membershipPlanBenefits below, never
// redefined per plan.
export const membershipBenefits = pgTable("membership_benefits", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull(),
  description: text("description"),
  // Free text, not an enum — the brief is explicit that benefit
  // categories aren't a fixed taxonomy yet (directory, marketing,
  // events, resources, referral tools, etc. are examples, not a final
  // list).
  category: text("category"),
  isActive: boolean("is_active").notNull().default(true),
  internalNotes: text("internal_notes"),
});

// Plan <-> Benefit join — a plan may list many benefits, a benefit may
// belong to many plans, never duplicated.
export const membershipPlanBenefits = pgTable(
  "membership_plan_benefits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => membershipPlans.id, { onDelete: "cascade" }),
    benefitId: uuid("benefit_id")
      .notNull()
      .references(() => membershipBenefits.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("membership_plan_benefits_unique_pair").on(
      table.planId,
      table.benefitId,
    ),
  ],
);

export const allianceMembershipStatusEnum = pgEnum(
  "alliance_membership_status",
  ["pending", "active", "paused", "expired", "cancelled"],
);

// Deliberately separate from membershipBillingModel — a membership can
// be billingModel="paid" on its plan yet still be feeType="waived" for
// this one alliance (an explicit human decision), which is exactly the
// flexibility section 9 of the brief asks for: $0 doesn't mean the same
// thing in every situation.
export const membershipFeeTypeEnum = pgEnum("membership_fee_type", [
  "standard",
  "complimentary",
  "waived",
  "sponsored",
  "custom",
]);

// One row per membership "episode" — assigning a NEW plan to an
// alliance that already has a membership inserts a new row rather than
// mutating the existing one (see assignAllianceMembership in
// src/lib/queries/memberships.ts), so planNameSnapshot/priceSnapshot on
// a past episode never change retroactively and the alliance's full
// plan history stays queryable by just listing every row for that
// allianceId, ordered by createdAt — no separate "membership history"
// table needed for plan changes (allianceMembershipStatusHistory below
// covers status transitions WITHIN one episode, the same split already
// used for referrals/compensation).
//
// planId is restricted (never cascaded) on delete: plans in this phase
// are only ever deactivated (isActive=false), never hard-deleted once
// any alliance has been on one, so this FK is a safety rail against
// silently orphaning historical membership data, not an expected path.
export const allianceMemberships = pgTable("alliance_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  allianceId: uuid("alliance_id")
    .notNull()
    .references(() => strategicAlliances.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => membershipPlans.id, { onDelete: "restrict" }),
  // Frozen at assignment time — survives the plan being renamed later.
  planNameSnapshot: text("plan_name_snapshot").notNull(),
  status: allianceMembershipStatusEnum("status").notNull().default("pending"),
  feeType: membershipFeeTypeEnum("fee_type").notNull().default("standard"),
  // Preserved reason when feeType is complimentary/waived/sponsored —
  // never silently dropped.
  waivedReason: text("waived_reason"),
  priceSnapshot: numeric("price_snapshot", { precision: 12, scale: 2 }),
  billingFrequencySnapshot: membershipBillingFrequencyEnum(
    "billing_frequency_snapshot",
  ),
  startDate: date("start_date"),
  renewalDate: date("renewal_date"),
  // Optional pointer to an existing Invoice an authorized human created
  // for this membership fee — never auto-created, never a second
  // invoice system. Set null (not cascaded) if that invoice is ever
  // deleted, so the membership record itself survives.
  invoiceId: uuid("invoice_id").references(() => invoices.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  createdByEmail: text("created_by_email"),
});

// Status transitions WITHIN one membership episode (pending -> active ->
// paused -> active -> expired/cancelled) — identical shape and purpose
// to allianceStatusHistory/referralStatusHistory above.
export const allianceMembershipStatusHistory = pgTable(
  "alliance_membership_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => allianceMemberships.id, { onDelete: "cascade" }),
    previousStatus: allianceMembershipStatusEnum("previous_status"),
    newStatus: allianceMembershipStatusEnum("new_status").notNull(),
    changedByEmail: text("changed_by_email"),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    note: text("note"),
  },
);

export const membershipBenefitOverrideTypeEnum = pgEnum(
  "membership_benefit_override_type",
  ["include", "exclude"],
);

// Alliance-specific adjustment layered on top of the plan's own benefit
// list (membershipPlanBenefits) — an extra benefit granted outside the
// plan, or a plan benefit explicitly excluded for this one member.
// Never mutates the global plan to customize a single alliance; the
// effective benefit list for a membership is always "plan benefits" +
// "include overrides" - "exclude overrides", computed at read time.
export const allianceMembershipBenefitOverrides = pgTable(
  "alliance_membership_benefit_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => allianceMemberships.id, { onDelete: "cascade" }),
    benefitId: uuid("benefit_id")
      .notNull()
      .references(() => membershipBenefits.id, { onDelete: "cascade" }),
    overrideType: membershipBenefitOverrideTypeEnum("override_type").notNull(),
    note: text("note"),
    createdByEmail: text("created_by_email"),
  },
);

export type MembershipPlan = typeof membershipPlans.$inferSelect;
export type MembershipBenefit = typeof membershipBenefits.$inferSelect;
export type AllianceMembership = typeof allianceMemberships.$inferSelect;
export type AllianceMembershipBenefitOverride =
  typeof allianceMembershipBenefitOverrides.$inferSelect;

// ===================================================================
// Phase 6, Session 1 — AI Team / Equipo IA (foundation)
//
// These agents are a visual management layer over automation the system
// already runs (automatic tasks, renewal/inactivity cron alerts) — not
// generative-AI chatbots wired to an external model. An agent "acts" only
// through the same rules-based mechanisms other parts of the app already
// use; nothing here calls an LLM or messages a client autonomously. Every
// agent reads/writes the same clients/cases/referrals rows everyone else
// does (see aiActivityLog below) — an agent never gets its own copy of
// client data.
// ===================================================================

export const aiAgentDepartmentEnum = pgEnum("ai_agent_department", [
  "client_service",
  "tax_bookkeeping",
  "commercial_finance",
  "immigration",
  "document_services",
  "business_consulting",
  "community_academy",
  "operations",
]);

export const aiAgentLanguageEnum = pgEnum("ai_agent_language", [
  "en",
  "es",
  "bilingual",
]);

export const aiAgentStatusEnum = pgEnum("ai_agent_status", [
  "online",
  "offline",
  "paused",
  "needs_review",
  "escalated",
]);

// Separate from aiAgentStatusEnum on purpose: the 3 future agents (Valentina,
// Camila, Marco) aren't part of the online/offline/paused state machine yet
// — they're inactive placeholder cards until their session builds them out.
export const aiAgentLaunchStatusEnum = pgEnum("ai_agent_launch_status", [
  "active",
  "coming_soon",
]);

export const aiAgentAvatarStyleEnum = pgEnum("ai_agent_avatar_style", [
  "human",
  "robot",
]);

// Every distinct data/module category referenced across the 5 initial
// agents' "Acceso permitido" / "Acceso NO permitido" lists in
// PHASE6-PLAN.md, deduplicated. Deliberately specific rather than reusing
// serviceTypeEnum — these are data-access grants, not service categories.
export const aiModuleKeyEnum = pgEnum("ai_module_key", [
  "clients",
  "client_360_basic",
  "client_basic_profile",
  "services",
  "appointments",
  "tasks",
  "communications",
  "lead_referral_source",
  "full_financial_records",
  "tax_return_details",
  "sensitive_immigration_files",
  "banking_data",
  "full_commission_details",
  "admin_settings",
  "system_credentials",
  "tax_records",
  "bookkeeping_records",
  "document_status",
  "payment_status",
  "client_business_profile",
  "company_registry_limited_fields",
  "company_registry",
  "company_registry_business_profile",
  "referral_records",
  "commercial_finance_module",
  "referral_commission_records",
  "commission_payment_status_basic",
  "immigration_admin_service_records",
  "immigration_forms_library",
  "uscis_official_resources",
  "authorized_client_document_folders",
  "document_prep_records",
  // Added when Valentina (AI Business Consulting Assistant) was activated —
  // same specificity as tax_records/referral_records/document_prep_records,
  // covering consultingServiceDetails (diagnosis, package, sessions,
  // milestones, action plan, 30/90-day goals).
  "consulting_service_records",
  // AI Foundation / Security phase — Diamond Community and B2B Alliances had
  // no module key at all, which meant no agent's deniedModules array could
  // even name them. Added so both can be explicitly DENIED (the default for
  // every existing agent, including Camila, despite her department literally
  // being "community_academy" — access is never inferred from a name) and so
  // a future explicit grant is possible without a schema change.
  "diamond_community",
  "b2b_alliances",
  // Same phase — Camila's future Academy scope (Students/Programs/Courses/
  // Modules/Progress/Attendance/Evaluations) needs its own key, same
  // specificity pattern as document_prep_records/consulting_service_records.
  "academy_records",
]);

export const aiKnowledgeBaseSectionEnum = pgEnum("ai_knowledge_base_section", [
  "approved_services",
  "approved_scripts",
  "faqs",
  "policies",
  "disclaimers",
  "checklists",
  "workflows",
  "forms",
  "official_resources",
  "escalation_rules",
  "prohibited_actions",
]);

export const aiEscalationRiskLevelEnum = pgEnum("ai_escalation_risk_level", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const aiEscalationStatusEnum = pgEnum("ai_escalation_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const aiActivityActionEnum = pgEnum("ai_activity_action", [
  "create_task",
  "create_note",
  "create_reminder",
  "classify_service",
  "draft_message",
  "change_status",
  "send_draft",
  "send_message",
  "escalate",
  "other",
  // AI Foundation / Security phase — section 7's Level 2 list named several
  // concrete action categories this enum had no value for yet, so the
  // approval-level policy function had nothing to classify them against.
  // Added so the architecture is enforceable, not just documented; none of
  // these have a real caller yet (no execution engine exists — see the
  // read-only audit).
  "update_client_data",
  "academy_grade_change",
  "invoice_status_change",
  "b2b_status_change",
  // Level 3 — "human only", never executable by an agent under any
  // approval, by design (see getApprovalLevelForAction).
  "financial_transaction",
  "payment_capture",
  "delete_record",
  "admin_change",
  "commission_change",
  "legal_determination",
  "immigration_determination",
  "document_release",
  "diamond_community_write",
  "b2b_alliance_write",
]);

export const aiActivityOutcomeEnum = pgEnum("ai_activity_outcome", [
  "success",
  "failed",
  "pending_approval",
  // AI Foundation / Security phase — distinct from "failed" (an attempted
  // action that errored) and "pending_approval" (a level-2 action waiting on
  // a human). "denied" records the authorization layer itself refusing the
  // action before it was ever attempted — module not allowed, module
  // explicitly denied, permission flag off, or level-3-human-only.
  "denied",
]);

// Section 11's 3-tier approval policy — a fixed rule about which *kind* of
// action requires a human, not a per-agent setting. Recorded on each log
// row so the AI dashboard can surface "Revisiones Humanas Pendientes"
// without re-deriving it from the action type every time.
export const aiApprovalLevelEnum = pgEnum("ai_approval_level", [
  "level_1_automatic",
  "level_2_human_review",
  "level_3_human_only",
]);

export const aiAgents = pgTable("ai_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  department: aiAgentDepartmentEnum("department").notNull(),
  language: aiAgentLanguageEnum("language").notNull().default("bilingual"),
  status: aiAgentStatusEnum("status").notNull().default("offline"),
  launchStatus: aiAgentLaunchStatusEnum("launch_status")
    .notNull()
    .default("active"),
  sortOrder: integer("sort_order").notNull().default(0),

  // Section 8 — avatar system. avatarUrl is populated later (Session 2)
  // once an upload flow exists; illustrated placeholder art ships first.
  avatarUrl: text("avatar_url"),
  avatarStyle: aiAgentAvatarStyleEnum("avatar_style")
    .notNull()
    .default("robot"),
  accentColor: text("accent_color"),
  voiceEnabled: boolean("voice_enabled").notNull().default(false),
  videoAvatarEnabled: boolean("video_avatar_enabled").notNull().default(false),
  bio: text("bio"),
  welcomeMessage: text("welcome_message"),
  disclaimerText: text("disclaimer_text"),

  // Section 10 — the 8 action permissions. There is deliberately no
  // "canDelete"/"canChangeCommission"/"canChangeAdminSettings" column at
  // all — section 10's default-deny list isn't a toggle an agent could
  // ever have set to true, it's the absence of the capability entirely.
  canRead: boolean("can_read").notNull().default(true),
  canWrite: boolean("can_write").notNull().default(false),
  canCreateTask: boolean("can_create_task").notNull().default(true),
  canCreateNote: boolean("can_create_note").notNull().default(true),
  canChangeStatus: boolean("can_change_status").notNull().default(false),
  canSendDraft: boolean("can_send_draft").notNull().default(true),
  canSendMessage: boolean("can_send_message").notNull().default(false),
  canEscalate: boolean("can_escalate").notNull().default(true),

  // Sections 2-6 — per-agent module/data-access allowlist and denylist.
  allowedModules: aiModuleKeyEnum("allowed_modules").array(),
  deniedModules: aiModuleKeyEnum("denied_modules").array(),
});

// Section 9 — one row per knowledge-base entry, grouped by section, so an
// agent can hold several FAQs/checklists/etc. under the same category.
export const aiAgentKnowledgeBase = pgTable("ai_agent_knowledge_base", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  section: aiKnowledgeBaseSectionEnum("section").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Section 12 — AI Escalations Center. FKs are onDelete "set null" (never
// cascade), same reasoning as caseStatusHistory/notaryLogEntries: this is
// an accountability record and must survive the agent, client, or case it
// referenced being deleted later.
export const aiEscalations = pgTable("ai_escalations", {
  id: uuid("id").primaryKey().defaultRandom(),
  escalationSeq: serial("escalation_seq").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  agentId: uuid("agent_id").references(() => aiAgents.id, {
    onDelete: "set null",
  }),
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  riskLevel: aiEscalationRiskLevelEnum("risk_level")
    .notNull()
    .default("medium"),
  status: aiEscalationStatusEnum("status").notNull().default("open"),
  assignedHumanEmail: text("assigned_human_email"),
  // AI Foundation / Security phase — additive structured link alongside the
  // free-text email above (kept as-is for every existing row and for
  // assigning to a human outside the users table, e.g. an external
  // accountant). Populated automatically when assignedHumanEmail matches a
  // real users.email, never required, never backfilled destructively.
  assignedHumanUserId: uuid("assigned_human_user_id").references(
    () => users.id,
    { onDelete: "set null" },
  ),
  resolution: text("resolution"),
  resolutionDate: date("resolution_date"),
});

// Section 13 — full audit trail of every agent action. Same "set null,
// never cascade" reasoning as aiEscalations above: an audit log entry must
// outlive the record it describes.
export const aiActivityLog = pgTable("ai_activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  agentId: uuid("agent_id").references(() => aiAgents.id, {
    onDelete: "set null",
  }),
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
  action: aiActivityActionEnum("action").notNull(),
  // AI Foundation / Security phase — which module-key the authorization
  // layer checked the action against, so a denial is traceable to a
  // specific allow/deny-list decision, not just a free-text actionDetail
  // guess. Nullable: pre-existing rows (and any future row logged outside
  // the module-scoped authorization path) simply have no module to record.
  moduleKey: aiModuleKeyEnum("module_key"),
  actionDetail: text("action_detail"),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  approvalLevel: aiApprovalLevelEnum("approval_level")
    .notNull()
    .default("level_1_automatic"),
  requiresHumanApproval: boolean("requires_human_approval")
    .notNull()
    .default(false),
  humanApproved: boolean("human_approved"),
  // Section 11 — "human approver if applicable". Separate from
  // humanApproved (the yes/no) so the audit trail also records *who*
  // approved a level-2 action, never a secret, always an email already
  // visible elsewhere in the CRM.
  humanApproverEmail: text("human_approver_email"),
  // MIADIAMANTE AI Foundation Phase 1B — WHO requested the logged action,
  // distinct from humanApproverEmail above (who approved it, if anyone).
  // Nullable: every pre-existing row (and any future row logged from a
  // path with no human requester, e.g. a scheduled/system action) simply
  // has no requester to record — never backfilled, never guessed.
  //
  // Deliberately email (text), not a user_id FK, matching the exact
  // convention humanApproverEmail already established in this table:
  // getCurrentRole()/the signIn callback in src/auth.ts both resolve
  // identity by email, and ADMIN_EMAIL (the owner) can be a fully valid
  // super_admin session with NO corresponding `users` row at all (see
  // auth.ts — the owner check never touches the database). A `user_id`
  // FK would be unrecordable for the owner whenever no such row exists,
  // and even for a normal staff session, `session.user.id` is the OAuth
  // provider's own account id (there is no Auth.js database adapter
  // configured), not reliably equal to `users.id` — so a FK here would
  // be a second, less trustworthy identity path, not a stronger one.
  // Always normalized to lowercase before write, matching users.email.
  requestedByUserEmail: text("requested_by_user_email"),
  outcome: aiActivityOutcomeEnum("outcome").notNull().default("success"),
  errorMessage: text("error_message"),
});

// MIADIAMANTE AI Foundation — Phase 2B-2: conversation persistence.
//
// Deliberately separate tables, not a reuse of any existing one — see the
// Phase 2B-2 audit report for the full survey. In particular:
//   - conversation_messages (the Communications module) requires a
//     clientId and models real-world logged client contact, not an
//     internal AI turn.
//   - website_chat_sessions is anonymous public-website visitor capture,
//     not an authenticated internal AMS user.
//   - ai_agents/ai_escalations belong to the 8-agent AI Team; MIADIAMANTE
//     is explicitly NOT a 9th ai_agents row (Phase 1B decision).
//   - ai_activity_log is the security/audit trail (see below) — product
//     conversation history and security audit history must never become
//     substitutes for each other, so there is no FK between this table
//     family and ai_activity_log in either direction.
export const miadiamanteConversationStatusEnum = pgEnum(
  "miadiamante_conversation_status",
  ["active", "closed"],
);

export const miadiamanteMessageRoleEnum = pgEnum("miadiamante_message_role", [
  "user",
  "assistant",
]);

export const miadiamanteConversations = pgTable(
  "miadiamante_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Ownership key — always server-derived from the authenticated
    // session's email (never a client-supplied value), always lowercased
    // before write/compare. This is the field every ownership check
    // compares against, matching the established requestedByUserEmail /
    // assignedHumanEmail pattern: the owner (ADMIN_EMAIL) can be a fully
    // valid super_admin session with NO corresponding `users` row, and
    // session.user.id is the OAuth provider's own account id (no Auth.js
    // database adapter configured) — so email, not a user_id FK, is the
    // only identity every authenticated session is guaranteed to have.
    ownerEmail: text("owner_email").notNull(),
    // Optional, advisory-only structured link — populated when a `users`
    // row happens to exist for ownerEmail, same pattern as
    // ai_escalations.assignedHumanUserId. Never required, never the
    // field an ownership check compares against.
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title"),
    status: miadiamanteConversationStatusEnum("status")
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  },
  (table) => [
    index("miadiamante_conversations_owner_email_idx").on(table.ownerEmail),
  ],
);

export const miadiamanteMessages = pgTable(
  "miadiamante_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Cascade is deliberate here, unlike the "never cascade" convention
    // used for audit/identity FKs elsewhere in this file (ai_activity_log,
    // ai_escalations) — those protect a record describing some OTHER
    // business entity from disappearing when that entity is deleted. A
    // message has no existence independent of its conversation; it IS
    // the conversation's content, not a record describing something
    // else. Direct precedent: invoice_line_items.invoice_id is
    // NOT NULL, onDelete: cascade for the identical reason.
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => miadiamanteConversations.id, { onDelete: "cascade" }),
    role: miadiamanteMessageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    // Phase 2B-2 data-minimization decision (owner-approved): the ONLY
    // tool-related metadata ever persisted. Never tool arguments, never
    // raw tool results, never the underlying client/invoice/task/
    // appointment DTOs a tool call returned, never raw exception text.
    // The assistant's own natural-language reply text (content above) is
    // what gets stored — never the structured data behind it.
    toolName: text("tool_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("miadiamante_messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

// Phase 2B-3 durable rate limiter (owner-approved design audit). An
// append-only event log, NOT a counter row — this is what makes a true
// rolling window possible (count WHERE occurred_at > now() - interval
// '1 hour' on read, rather than a fixed-window counter that resets on a
// clock boundary). Deliberately owner_email-only, with NO FK to users
// or to miadiamante_conversations/miadiamante_messages: this table has
// no relationship to conversation content, only to the rate-limiting
// decision itself, and (like ai_activity_log.requestedByUserEmail) the
// owner/ADMIN_EMAIL must be rate-limitable with no corresponding
// `users` row. No cleanup/retention mechanism yet (explicitly deferred
// to a later step) — old rows outside the window are simply never
// counted, so their presence doesn't affect correctness.
export const miadiamanteRateLimitEvents = pgTable(
  "miadiamante_rate_limit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerEmail: text("owner_email").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("miadiamante_rate_limit_events_owner_occurred_idx").on(
      table.ownerEmail,
      table.occurredAt,
    ),
  ],
);

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
export type NotaryStateGuide = typeof notaryStateGuide.$inferSelect;
export type IrsCaseDetails = typeof irsCaseDetails.$inferSelect;
export type InsuranceComplianceDetails =
  typeof insuranceComplianceDetails.$inferSelect;
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
export type ReferralCompensation = typeof referralCompensations.$inferSelect;
export type ReferralCompensationPayment =
  typeof referralCompensationPayments.$inferSelect;
export type AcademyEnrollmentDetails =
  typeof academyEnrollmentDetails.$inferSelect;
export type AcademyDiamondMember = typeof academyDiamondMembers.$inferSelect;
export type AcademyInstructor = typeof academyInstructors.$inferSelect;
export type AcademyMentor = typeof academyMentors.$inferSelect;
export type AcademyProgram = typeof academyPrograms.$inferSelect;
export type AcademyCourse = typeof academyCourses.$inferSelect;
export type AcademyCourseModule = typeof academyCourseModules.$inferSelect;
export type AcademyStudentModuleProgress =
  typeof academyStudentModuleProgress.$inferSelect;
export type AcademyAttendanceSession = typeof academyAttendanceSessions.$inferSelect;
export type AcademyAttendanceRecord = typeof academyAttendanceRecords.$inferSelect;
export type AcademyEvaluation = typeof academyEvaluations.$inferSelect;
export type AcademyEvaluationResult = typeof academyEvaluationResults.$inferSelect;
export type AcademyCertificate = typeof academyCertificates.$inferSelect;
export type SocialMediaContent = typeof socialMediaContent.$inferSelect;
export type StrategicAlliance = typeof strategicAlliances.$inferSelect;
export type AllianceStatusHistory =
  typeof allianceStatusHistory.$inferSelect;
export type AllianceContact = typeof allianceContacts.$inferSelect;
export type AllianceDocument = typeof allianceDocuments.$inferSelect;
export type MarketingProjectDetails =
  typeof marketingProjectDetails.$inferSelect;
export type AiAgent = typeof aiAgents.$inferSelect;
export type AiAgentKnowledgeBaseEntry =
  typeof aiAgentKnowledgeBase.$inferSelect;
export type AiEscalation = typeof aiEscalations.$inferSelect;
export type AiActivityLogEntry = typeof aiActivityLog.$inferSelect;
export type MiadiamanteConversation =
  typeof miadiamanteConversations.$inferSelect;
export type MiadiamanteMessage = typeof miadiamanteMessages.$inferSelect;
export type MiadiamanteRateLimitEvent =
  typeof miadiamanteRateLimitEvents.$inferSelect;
export type ServiceColorSetting = typeof serviceColorSettings.$inferSelect;
export type ServiceCatalogItem = typeof serviceCatalogItems.$inferSelect;
export type OnlineBookingSettingsRow = typeof onlineBookingSettings.$inferSelect;
export type OnlineBookingServiceRow = typeof onlineBookingServices.$inferSelect;
export type OnlineBookingBlockedDate = typeof onlineBookingBlockedDates.$inferSelect;
export type PortalAccessLink = typeof portalAccessLinks.$inferSelect;
export type PortalSession = typeof portalSessions.$inferSelect;

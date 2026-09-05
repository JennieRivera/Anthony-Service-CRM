CREATE TYPE "public"."bookkeeping_case_status" AS ENUM('lead', 'assessment', 'proposal_sent', 'onboarding', 'access_pending', 'documents_pending', 'bookkeeping_in_progress', 'reconciliation', 'internal_review', 'reports_ready', 'client_review', 'active_monthly', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."bookkeeping_frequency" AS ENUM('monthly', 'quarterly', 'cleanup', 'catch_up');--> statement-breakpoint
CREATE TYPE "public"."deliverable_status" AS ENUM('not_started', 'in_progress', 'ready', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."immigration_case_status" AS ENUM('new_inquiry', 'administrative_intake', 'client_instructions_pending', 'documents_pending', 'administrative_preparation', 'client_review', 'signature_pending', 'ready_for_client_filing', 'attorney_referral', 'completed', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."service_type" ADD VALUE 'bookkeeping';--> statement-breakpoint
ALTER TYPE "public"."service_type" ADD VALUE 'immigration';--> statement-breakpoint
CREATE TABLE "bookkeeping_service_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"business_name" text,
	"entity_type" text,
	"industry" text,
	"frequency" "bookkeeping_frequency",
	"accounting_software" text,
	"number_of_bank_accounts" integer,
	"number_of_credit_card_accounts" integer,
	"payroll_used" boolean DEFAULT false NOT NULL,
	"monthly_revenue_range" text,
	"last_month_reconciled" date,
	"cleanup_required" boolean DEFAULT false NOT NULL,
	"catch_up_start_month" date,
	"catch_up_end_month" date,
	"next_billing_date" date,
	"reports_required" text,
	"profit_loss_status" "deliverable_status",
	"balance_sheet_status" "deliverable_status",
	"status" "bookkeeping_case_status" DEFAULT 'lead' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "immigration_service_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"administrative_service_type" text,
	"form_number" text,
	"client_requested_form" boolean DEFAULT false NOT NULL,
	"client_provided_instructions" text,
	"language" text,
	"translation_needed" boolean DEFAULT false NOT NULL,
	"translation_status" "deliverable_status",
	"attorney_referral_needed" boolean DEFAULT false NOT NULL,
	"attorney_referral_date" date,
	"government_filing_fee" numeric(12, 2),
	"status" "immigration_case_status" DEFAULT 'new_inquiry' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookkeeping_service_details" ADD CONSTRAINT "bookkeeping_service_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immigration_service_details" ADD CONSTRAINT "immigration_service_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
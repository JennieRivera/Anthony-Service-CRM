CREATE TYPE "public"."formation_case_status" AS ENUM('new_inquiry', 'intake', 'name_review', 'documents_pending', 'ready_to_file', 'filed', 'state_pending', 'approved', 'ein_stage', 'documents_delivered', 'completed');--> statement-breakpoint
CREATE TYPE "public"."formation_type" AS ENUM('llc', 'corporation', 'nonprofit', 'other');--> statement-breakpoint
CREATE TYPE "public"."referral_category" AS ENUM('general', 'commercial_finance');--> statement-breakpoint
CREATE TYPE "public"."rri_status" AS ENUM('new_referral', 'consent_pending', 'submitted_to_rri', 'rri_reviewing', 'documents_pending', 'qualified', 'declined', 'approved', 'closing', 'funded', 'commission_due', 'commission_paid', 'closed');--> statement-breakpoint
CREATE TABLE "business_formation_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"formation_type" "formation_type",
	"state_of_formation" text,
	"business_name" text,
	"name_availability_checked" boolean DEFAULT false NOT NULL,
	"registered_agent" text,
	"ein_assistance" boolean DEFAULT false NOT NULL,
	"state_filing_date" date,
	"state_approval_date" date,
	"document_delivery_status" "deliverable_status",
	"government_fee" numeric(12, 2),
	"status" "formation_case_status" DEFAULT 'new_inquiry' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_id" uuid NOT NULL,
	"previous_status" "referral_status",
	"new_status" "referral_status" NOT NULL,
	"changed_by_email" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "rri_referral_details" (
	"referral_id" uuid PRIMARY KEY NOT NULL,
	"business_name" text,
	"business_entity" text,
	"industry" text,
	"years_in_business" integer,
	"funding_purpose" text,
	"amount_requested" numeric(12, 2),
	"monthly_revenue_range" text,
	"financing_type" text,
	"documents_requested" text,
	"documents_received" text,
	"consent_to_share_information" boolean DEFAULT false NOT NULL,
	"status" "rri_status" DEFAULT 'new_referral' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "category" "referral_category" DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "commission_due_date" date;--> statement-breakpoint
ALTER TABLE "business_formation_details" ADD CONSTRAINT "business_formation_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_status_history" ADD CONSTRAINT "referral_status_history_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rri_referral_details" ADD CONSTRAINT "rri_referral_details_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;
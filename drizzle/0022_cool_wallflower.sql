CREATE TYPE "public"."irs_application_status" AS ENUM('not_started', 'in_progress', 'submitted', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."irs_case_type" AS ENUM('ein_assistance', 'itin_assistance', 'business_account_follow_up', 'irs_correspondence', 'other');--> statement-breakpoint
CREATE TYPE "public"."irs_ein_status" AS ENUM('not_started', 'information_pending', 'ready', 'submitted', 'ein_received', 'closed');--> statement-breakpoint
CREATE TYPE "public"."irs_itin_status" AS ENUM('not_started', 'documents_pending', 'w7_preparation', 'certification_documentation_step', 'submitted', 'irs_processing', 'additional_information_requested', 'itin_received', 'closed');--> statement-breakpoint
CREATE TYPE "public"."irs_resource_category" AS ENUM('ein', 'itin', 'business_taxes', 'employment_taxes', 'estimated_taxes', 'irs_forms', 'irs_publications', 'irs_notices', 'irs_contact_resources');--> statement-breakpoint
ALTER TYPE "public"."service_type" ADD VALUE 'irs_administrative';--> statement-breakpoint
CREATE TABLE "irs_case_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"case_type" "irs_case_type" DEFAULT 'ein_assistance' NOT NULL,
	"taxpayer_name" text,
	"responsible_party" text,
	"state" text,
	"submission_method" text,
	"submission_date" date,
	"irs_reference_number" text,
	"ein_status" "irs_ein_status",
	"itin_status" "irs_itin_status",
	"application_status" "irs_application_status",
	"irs_letter_received" boolean DEFAULT false NOT NULL,
	"irs_letter_date" date
);
--> statement-breakpoint
CREATE TABLE "irs_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"category" "irs_resource_category" NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"last_verified_date" date,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "irs_case_details" ADD CONSTRAINT "irs_case_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "irs_case_details" ADD CONSTRAINT "irs_case_details_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
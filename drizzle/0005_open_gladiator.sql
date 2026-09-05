CREATE TYPE "public"."id_verification_status" AS ENUM('pending', 'verified', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notary_case_status" AS ENUM('new_request', 'contacted', 'appointment_scheduled', 'waiting_for_documents', 'ready_for_signing', 'completed', 'scanbacks_pending', 'shipping_pending', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notary_modality" AS ENUM('in_person', 'mobile', 'ron', 'ipen');--> statement-breakpoint
CREATE TYPE "public"."tax_case_status" AS ENUM('new_client', 'intake_pending', 'documents_pending', 'ready_for_preparation', 'in_preparation', 'internal_review', 'client_review', 'signature_pending', 'ready_to_efile', 'filed', 'accepted', 'rejected_correction_needed', 'completed');--> statement-breakpoint
CREATE TYPE "public"."tax_filer_type" AS ENUM('individual', 'business');--> statement-breakpoint
CREATE TYPE "public"."tax_filing_status" AS ENUM('single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household', 'qualifying_widow');--> statement-breakpoint
CREATE TYPE "public"."tax_jurisdiction" AS ENUM('federal', 'state');--> statement-breakpoint
ALTER TYPE "public"."service_type" ADD VALUE 'notary';--> statement-breakpoint
CREATE TABLE "notary_service_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"modality" "notary_modality" NOT NULL,
	"appointment_date" date,
	"appointment_time" time,
	"location" text,
	"number_of_signers" integer,
	"number_of_documents" integer,
	"number_of_notarial_acts" integer,
	"id_verification_status" "id_verification_status",
	"witness_required" boolean DEFAULT false NOT NULL,
	"witness_provided_by" text,
	"document_type" text,
	"loan_signing_company" text,
	"title_company" text,
	"signing_service" text,
	"scanbacks_required" boolean DEFAULT false NOT NULL,
	"shipping_required" boolean DEFAULT false NOT NULL,
	"tracking_number" text,
	"notary_fee" numeric(12, 2),
	"travel_fee" numeric(12, 2),
	"printing_fee" numeric(12, 2),
	"status" "notary_case_status" DEFAULT 'new_request' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_service_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"tax_year" integer NOT NULL,
	"filer_type" "tax_filer_type" NOT NULL,
	"jurisdiction" "tax_jurisdiction" DEFAULT 'federal' NOT NULL,
	"return_type" text,
	"filing_status" "tax_filing_status",
	"business_entity_type" text,
	"intake_completed" boolean DEFAULT false NOT NULL,
	"efile_authorization_signed" boolean DEFAULT false NOT NULL,
	"refund_amount" numeric(12, 2),
	"balance_due_amount" numeric(12, 2),
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"internal_notes" text,
	"status" "tax_case_status" DEFAULT 'new_client' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notary_service_details" ADD CONSTRAINT "notary_service_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_service_details" ADD CONSTRAINT "tax_service_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
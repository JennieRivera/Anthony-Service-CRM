CREATE TYPE "public"."immigration_document_folder" AS ENUM('intake', 'identity_documents', 'client_provided_information', 'government_forms', 'supporting_documents', 'translation', 'signatures', 'filing_confirmation', 'government_notices', 'final_documents');--> statement-breakpoint
CREATE TYPE "public"."immigration_form_category" AS ENUM('family_based', 'employment_based', 'humanitarian', 'citizenship_naturalization', 'permanent_residence', 'work_authorization', 'travel_documents', 'affidavits_supporting_forms', 'change_of_address', 'fee_waivers', 'uscis_general_forms', 'other');--> statement-breakpoint
CREATE TABLE "immigration_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"form_number" text NOT NULL,
	"form_name" text NOT NULL,
	"category" "immigration_form_category" NOT NULL,
	"official_source" text,
	"official_url" text NOT NULL,
	"current_edition_date" date,
	"edition_notes" text,
	"filing_fee_reference" text,
	"instructions_url" text,
	"checklist" text,
	"internal_notes" text,
	"last_verified_date" date,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "folder" "immigration_document_folder";
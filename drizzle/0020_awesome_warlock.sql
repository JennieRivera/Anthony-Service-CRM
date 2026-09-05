CREATE TYPE "public"."company_document_category" AS ENUM('formation_documents', 'ein_documents', 'operating_agreement', 'bylaws', 'state_registration', 'annual_report', 'business_licenses', 'sales_tax', 'insurance', 'bookkeeping', 'tax_returns', 'contracts', 'financing_documents', 'other');--> statement-breakpoint
CREATE TYPE "public"."company_document_checklist_status" AS ENUM('requested', 'received', 'verified', 'expired', 'renewal_due');--> statement-breakpoint
CREATE TABLE "company_document_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"category" "company_document_category" NOT NULL,
	"description" text,
	"status" "company_document_checklist_status" DEFAULT 'requested' NOT NULL,
	"due_date" date,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "company_document_checklist_items" ADD CONSTRAINT "company_document_checklist_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
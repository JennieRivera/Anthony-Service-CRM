CREATE TYPE "public"."sales_tax_case_status" AS ENUM('not_started', 'research_required', 'registration_pending', 'submitted', 'approved', 'account_active', 'filing_due', 'filed', 'past_due', 'closed');--> statement-breakpoint
CREATE TYPE "public"."sales_tax_filing_frequency" AS ENUM('monthly', 'quarterly', 'annual', 'other');--> statement-breakpoint
ALTER TYPE "public"."service_type" ADD VALUE 'sales_tax';--> statement-breakpoint
CREATE TABLE "sales_tax_case_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"state" text NOT NULL,
	"state_tax_agency" text,
	"agency_website" text,
	"registration_portal_url" text,
	"sales_tax_account_number" text,
	"status" "sales_tax_case_status" DEFAULT 'not_started' NOT NULL,
	"registration_date" date,
	"effective_date" date,
	"filing_frequency" "sales_tax_filing_frequency",
	"next_filing_due_date" date,
	"last_filed_period" text,
	"last_filing_date" date,
	"amount_due" numeric(12, 2),
	"amount_paid" numeric(12, 2),
	"payment_date" date,
	"account_status" text
);
--> statement-breakpoint
CREATE TABLE "sales_tax_state_info" (
	"state" text PRIMARY KEY NOT NULL,
	"state_tax_agency" text,
	"official_website" text,
	"registration_link" text,
	"filing_portal_link" text,
	"business_registration_link" text,
	"notes" text,
	"last_verified_date" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales_tax_case_details" ADD CONSTRAINT "sales_tax_case_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_tax_case_details" ADD CONSTRAINT "sales_tax_case_details_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
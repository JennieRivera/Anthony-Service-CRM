CREATE TYPE "public"."insurance_compliance_status" AS ENUM('not_started', 'in_progress', 'active', 'expired', 'renewed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."insurance_compliance_type" AS ENUM('workers_comp', 'liability_insurance', 'payroll', 'hipaa_compliance', 'general_insurance', 'other');--> statement-breakpoint
ALTER TYPE "public"."service_type" ADD VALUE 'insurance_compliance';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'renewal_reminder';--> statement-breakpoint
CREATE TABLE "insurance_compliance_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"sub_type" "insurance_compliance_type" DEFAULT 'general_insurance' NOT NULL,
	"provider" text,
	"policy_or_account_number" text,
	"coverage_amount" numeric(12, 2),
	"premium_amount" numeric(12, 2),
	"effective_date" date,
	"expiration_date" date,
	"renewal_reminder_days" integer DEFAULT 30 NOT NULL,
	"status" "insurance_compliance_status" DEFAULT 'not_started' NOT NULL,
	"last_renewed_date" date,
	"compliance_notes" text
);
--> statement-breakpoint
ALTER TABLE "insurance_compliance_details" ADD CONSTRAINT "insurance_compliance_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_compliance_details" ADD CONSTRAINT "insurance_compliance_details_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
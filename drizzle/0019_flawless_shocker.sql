CREATE TYPE "public"."company_accounting_method" AS ENUM('cash', 'accrual');--> statement-breakpoint
CREATE TYPE "public"."company_ein_status" AS ENUM('not_started', 'applied', 'received');--> statement-breakpoint
CREATE TYPE "public"."company_entity_type" AS ENUM('llc', 'corporation', 's_corporation', 'partnership', 'sole_proprietor', 'nonprofit', 'other');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"legal_business_name" text NOT NULL,
	"dba_name" text,
	"entity_type" "company_entity_type",
	"state_of_formation" text,
	"formation_date" date,
	"state_document_number" text,
	"ein_status" "company_ein_status" DEFAULT 'not_started' NOT NULL,
	"ein_last4" text,
	"registered_agent" text,
	"registered_agent_address" text,
	"principal_business_address" text,
	"mailing_address" text,
	"phone" text,
	"email" text,
	"website" text,
	"industry" text,
	"naics_code" text,
	"business_description" text,
	"years_in_business" integer,
	"number_of_employees" integer,
	"annual_revenue_range" text,
	"monthly_revenue_range" text,
	"fiscal_year_end" text,
	"accounting_method" "company_accounting_method",
	"bookkeeping_software" text,
	"payroll_provider" text,
	"sales_tax_required" boolean DEFAULT false NOT NULL,
	"sales_tax_states" text[],
	"licenses_required" text,
	"insurance_status" text,
	"banking_relationship" text,
	"business_credit_status" text,
	"funding_needs" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "company_authorized_representatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"role" text,
	"phone" text,
	"email" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "company_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"role" text,
	"phone" text,
	"email" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "company_owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"role" text,
	"ownership_percentage" numeric(5, 2),
	"phone" text,
	"email" text,
	"preferred_language" text,
	"authorized_signer" boolean DEFAULT false NOT NULL,
	"start_date" date,
	"end_date" date,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "company_authorized_representatives" ADD CONSTRAINT "company_authorized_representatives_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_authorized_representatives" ADD CONSTRAINT "company_authorized_representatives_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_contacts" ADD CONSTRAINT "company_contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_contacts" ADD CONSTRAINT "company_contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_owners" ADD CONSTRAINT "company_owners_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_owners" ADD CONSTRAINT "company_owners_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
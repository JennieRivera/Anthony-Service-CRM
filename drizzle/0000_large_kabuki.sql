CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('new', 'in_progress', 'waiting_on_client', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('lead', 'active', 'in_progress', 'completed', 'follow_up');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'received', 'submitted', 'returned');--> statement-breakpoint
CREATE TYPE "public"."id_verification_method" AS ENUM('personal_knowledge', 'id_card', 'credible_witness');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('unpaid', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notarial_act_type" AS ENUM('jurat', 'acknowledgment', 'oath_affirmation', 'signature_witnessing', 'copy_certification', 'other');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('notary', 'mobile_notary', 'online_notary', 'immigration', 'tax_prep', 'apostille', 'document_prep', 'credit_financing');--> statement-breakpoint
CREATE TABLE "apostille_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"destination_country" text NOT NULL,
	"instrument_type" text NOT NULL,
	"submission_date" date,
	"expected_return_date" date,
	"actual_return_date" date,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid NOT NULL,
	"case_id" uuid,
	"title" text NOT NULL,
	"service_type" "service_type" NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"location" text,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid NOT NULL,
	"service_type" "service_type" NOT NULL,
	"status" "case_status" DEFAULT 'new' NOT NULL,
	"title" text NOT NULL,
	"due_date" date,
	"fee" numeric(12, 2),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"status" "client_status" DEFAULT 'lead' NOT NULL,
	"referral_source" text,
	"interested_services" "service_type"[],
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid NOT NULL,
	"case_id" uuid,
	"file_name" text NOT NULL,
	"blob_url" text NOT NULL,
	"document_type" text,
	"status" "document_status",
	"uploaded_by" uuid
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invoice_seq" serial NOT NULL,
	"client_id" uuid NOT NULL,
	"case_id" uuid,
	"status" "invoice_status" DEFAULT 'unpaid' NOT NULL,
	"issue_date" date DEFAULT now() NOT NULL,
	"due_date" date,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2),
	"total" numeric(12, 2) NOT NULL,
	"payment_method" text,
	"paid_at" timestamp with time zone,
	"notes" text,
	CONSTRAINT "invoices_invoice_seq_unique" UNIQUE("invoice_seq")
);
--> statement-breakpoint
CREATE TABLE "notary_log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entry_date" date NOT NULL,
	"client_id" uuid,
	"case_id" uuid,
	"client_name_snapshot" text NOT NULL,
	"document_type" text NOT NULL,
	"notarial_act_type" "notarial_act_type" NOT NULL,
	"id_verification_method" "id_verification_method" NOT NULL,
	"fee_charged" numeric(12, 2),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "apostille_details" ADD CONSTRAINT "apostille_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notary_log_entries" ADD CONSTRAINT "notary_log_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notary_log_entries" ADD CONSTRAINT "notary_log_entries_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;
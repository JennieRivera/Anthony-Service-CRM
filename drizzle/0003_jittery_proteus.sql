CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'partial', 'paid', 'overdue', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('submitted', 'in_progress', 'closed_won', 'closed_lost');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('none', 'partial', 'full');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount_total" numeric(12, 2) NOT NULL,
	"deposit_amount" numeric(12, 2),
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"balance_due" numeric(12, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"payment_date" date,
	"payment_method" text,
	"transaction_confirmation" text,
	"receipt_number" text,
	"refund_status" "refund_status" DEFAULT 'none' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"referral_seq" serial NOT NULL,
	"referral_date" date DEFAULT now() NOT NULL,
	"client_id" uuid NOT NULL,
	"case_id" uuid,
	"originating_business" text,
	"referred_by" text NOT NULL,
	"receiving_party" text NOT NULL,
	"status" "referral_status" DEFAULT 'submitted' NOT NULL,
	"closed_date" date,
	"gross_revenue" numeric(12, 2),
	"allowed_deductions" numeric(12, 2),
	"net_service_revenue" numeric(12, 2),
	"commission_percentage" numeric(5, 2),
	"commission_due" numeric(12, 2),
	"commission_paid_date" date,
	"payment_method" text,
	"payment_confirmation" text,
	"notes" text,
	CONSTRAINT "referrals_referral_seq_unique" UNIQUE("referral_seq")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;
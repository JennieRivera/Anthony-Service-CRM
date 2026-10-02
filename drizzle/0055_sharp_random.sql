CREATE TYPE "public"."compensation_earning_trigger" AS ENUM('client_signed', 'deposit_received', 'full_payment_received', 'manual_confirmation', 'other');--> statement-breakpoint
CREATE TYPE "public"."compensation_partial_payment_rule" AS ENUM('proportional', 'full_payment_only', 'manual');--> statement-breakpoint
CREATE TYPE "public"."compensation_status" AS ENUM('not_earned', 'earned', 'approved', 'paid');--> statement-breakpoint
CREATE TYPE "public"."compensation_type" AS ENUM('none', 'percentage', 'fixed', 'custom');--> statement-breakpoint
CREATE TABLE "referral_compensation_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"referral_compensation_id" uuid NOT NULL,
	"amount_paid" numeric(12, 2) NOT NULL,
	"payment_date" date NOT NULL,
	"payment_method" text,
	"payment_reference" text,
	"notes" text,
	"recorded_by_email" text,
	"reversed" boolean DEFAULT false NOT NULL,
	"reversed_at" timestamp with time zone,
	"reversed_by_email" text,
	"reversal_reason" text
);
--> statement-breakpoint
CREATE TABLE "referral_compensations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"referral_id" uuid NOT NULL,
	"compensation_type" "compensation_type" DEFAULT 'none' NOT NULL,
	"percentage_rate" numeric(5, 2),
	"fixed_amount" numeric(12, 2),
	"eligible_base_amount" numeric(12, 2),
	"base_description" text,
	"earning_trigger" "compensation_earning_trigger",
	"earning_trigger_notes" text,
	"partial_payment_rule" "compensation_partial_payment_rule",
	"agreement_document_id" uuid,
	"status" "compensation_status" DEFAULT 'not_earned' NOT NULL,
	"earned_at" timestamp with time zone,
	"earned_by_email" text,
	"earned_notes" text,
	"approved_amount" numeric(12, 2),
	"approved_at" timestamp with time zone,
	"approved_by_email" text,
	"approval_notes" text,
	"notes" text,
	"created_by_email" text,
	CONSTRAINT "referral_compensations_referral_id_unique" UNIQUE("referral_id")
);
--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "referrer_client_id" uuid;--> statement-breakpoint
ALTER TABLE "referral_compensation_payments" ADD CONSTRAINT "referral_compensation_payments_referral_compensation_id_referral_compensations_id_fk" FOREIGN KEY ("referral_compensation_id") REFERENCES "public"."referral_compensations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_compensations" ADD CONSTRAINT "referral_compensations_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_compensations" ADD CONSTRAINT "referral_compensations_agreement_document_id_alliance_documents_id_fk" FOREIGN KEY ("agreement_document_id") REFERENCES "public"."alliance_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_client_id_clients_id_fk" FOREIGN KEY ("referrer_client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
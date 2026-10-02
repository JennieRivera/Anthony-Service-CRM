CREATE TYPE "public"."alliance_membership_status" AS ENUM('pending', 'active', 'paused', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."membership_benefit_override_type" AS ENUM('include', 'exclude');--> statement-breakpoint
CREATE TYPE "public"."membership_billing_frequency" AS ENUM('monthly', 'annual', 'one_time', 'custom');--> statement-breakpoint
CREATE TYPE "public"."membership_billing_model" AS ENUM('free', 'paid', 'custom');--> statement-breakpoint
CREATE TYPE "public"."membership_fee_type" AS ENUM('standard', 'complimentary', 'waived', 'sponsored', 'custom');--> statement-breakpoint
CREATE TABLE "alliance_membership_benefit_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"membership_id" uuid NOT NULL,
	"benefit_id" uuid NOT NULL,
	"override_type" "membership_benefit_override_type" NOT NULL,
	"note" text,
	"created_by_email" text
);
--> statement-breakpoint
CREATE TABLE "alliance_membership_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid NOT NULL,
	"previous_status" "alliance_membership_status",
	"new_status" "alliance_membership_status" NOT NULL,
	"changed_by_email" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "alliance_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"alliance_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"plan_name_snapshot" text NOT NULL,
	"status" "alliance_membership_status" DEFAULT 'pending' NOT NULL,
	"fee_type" "membership_fee_type" DEFAULT 'standard' NOT NULL,
	"waived_reason" text,
	"price_snapshot" numeric(12, 2),
	"billing_frequency_snapshot" "membership_billing_frequency",
	"start_date" date,
	"renewal_date" date,
	"invoice_id" uuid,
	"notes" text,
	"created_by_email" text
);
--> statement-breakpoint
CREATE TABLE "membership_benefits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"internal_notes" text
);
--> statement-breakpoint
CREATE TABLE "membership_plan_benefits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"plan_id" uuid NOT NULL,
	"benefit_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"billing_model" "membership_billing_model" DEFAULT 'free' NOT NULL,
	"price" numeric(12, 2),
	"billing_frequency" "membership_billing_frequency",
	"currency" text DEFAULT 'USD' NOT NULL,
	"benefits_summary" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_email" text
);
--> statement-breakpoint
ALTER TABLE "alliance_membership_benefit_overrides" ADD CONSTRAINT "alliance_membership_benefit_overrides_membership_id_alliance_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."alliance_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alliance_membership_benefit_overrides" ADD CONSTRAINT "alliance_membership_benefit_overrides_benefit_id_membership_benefits_id_fk" FOREIGN KEY ("benefit_id") REFERENCES "public"."membership_benefits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alliance_membership_status_history" ADD CONSTRAINT "alliance_membership_status_history_membership_id_alliance_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."alliance_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alliance_memberships" ADD CONSTRAINT "alliance_memberships_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alliance_memberships" ADD CONSTRAINT "alliance_memberships_plan_id_membership_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."membership_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alliance_memberships" ADD CONSTRAINT "alliance_memberships_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_plan_benefits" ADD CONSTRAINT "membership_plan_benefits_plan_id_membership_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."membership_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_plan_benefits" ADD CONSTRAINT "membership_plan_benefits_benefit_id_membership_benefits_id_fk" FOREIGN KEY ("benefit_id") REFERENCES "public"."membership_benefits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "membership_plan_benefits_unique_pair" ON "membership_plan_benefits" USING btree ("plan_id","benefit_id");
CREATE TYPE "public"."academy_case_status" AS ENUM('lead', 'registered', 'payment_pending', 'enrolled', 'active_student', 'in_progress', 'completed', 'certificate_pending', 'certified', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."alliance_status" AS ENUM('prospect', 'contacted', 'meeting_scheduled', 'under_discussion', 'agreement_review', 'active_partner', 'paused', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."highlevel_sync_status" AS ENUM('not_synced', 'synced', 'error');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('church', 'chamber_of_commerce', 'cpa_accountant', 'attorney', 'insurance', 'realtor', 'consultant', 'financial_partner', 'technology_partner', 'community_organization', 'professional_association', 'other');--> statement-breakpoint
ALTER TYPE "public"."service_type" ADD VALUE 'academy';--> statement-breakpoint
CREATE TABLE "academy_enrollment_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"program" text,
	"course" text,
	"enrollment_date" date,
	"modules_completed" integer,
	"progress_percentage" integer,
	"attendance_percentage" integer,
	"assignments_completed" integer,
	"final_evaluation" text,
	"certificate_date" date,
	"community_access" boolean DEFAULT false NOT NULL,
	"highlevel_sync_status" "highlevel_sync_status" DEFAULT 'not_synced' NOT NULL,
	"status" "academy_case_status" DEFAULT 'lead' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alliance_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alliance_id" uuid NOT NULL,
	"previous_status" "alliance_status",
	"new_status" "alliance_status" NOT NULL,
	"changed_by_email" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "strategic_alliances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_name" text NOT NULL,
	"contact_person" text,
	"organization_type" "organization_type",
	"phone" text,
	"email" text,
	"website" text,
	"state" text,
	"country" text,
	"relationship_owner" text,
	"date_introduced" date,
	"services_connected" text,
	"referral_agreement" boolean DEFAULT false NOT NULL,
	"commission_agreement" boolean DEFAULT false NOT NULL,
	"marketing_permission" boolean DEFAULT false NOT NULL,
	"logo_permission" boolean DEFAULT false NOT NULL,
	"last_contact" date,
	"next_follow_up" date,
	"status" "alliance_status" DEFAULT 'prospect' NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "academy_enrollment_details" ADD CONSTRAINT "academy_enrollment_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alliance_status_history" ADD CONSTRAINT "alliance_status_history_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;
CREATE TYPE "public"."marketing_case_status" AS ENUM('discovery', 'audit', 'strategy', 'proposal', 'approved', 'build', 'testing', 'client_review', 'live', 'optimization', 'completed');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('marketing', 'branding', 'crm', 'automation', 'ai');--> statement-breakpoint
ALTER TYPE "public"."service_type" ADD VALUE 'marketing';--> statement-breakpoint
CREATE TABLE "marketing_project_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"project_type" "project_type",
	"business_goal" text,
	"current_systems" text,
	"deliverables" text,
	"integrations_required" text,
	"ai_agent_required" boolean DEFAULT false NOT NULL,
	"completion_percentage" integer,
	"status" "marketing_case_status" DEFAULT 'discovery' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing_project_details" ADD CONSTRAINT "marketing_project_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
CREATE TYPE "public"."consulting_case_status" AS ENUM('lead', 'discovery_call', 'diagnosis', 'proposal', 'agreement_signed', 'implementation', 'review', 'active_consulting', 'final_review', 'completed');--> statement-breakpoint
CREATE TYPE "public"."credit_account_type" AS ENUM('personal', 'business');--> statement-breakpoint
CREATE TYPE "public"."credit_case_status" AS ENUM('new_inquiry', 'consultation_scheduled', 'assessment', 'education', 'action_plan', 'follow_up', 'monitoring', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "consulting_service_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"business_problem" text,
	"business_stage" text,
	"diagnosis_summary" text,
	"primary_goal" text,
	"recommended_strategy" text,
	"consulting_package" text,
	"number_of_sessions" integer,
	"sessions_completed" integer,
	"milestones" text,
	"action_plan" text,
	"goal_30_day" text,
	"goal_90_day" text,
	"completion_percentage" integer,
	"status" "consulting_case_status" DEFAULT 'lead' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_service_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"credit_service_type" text,
	"account_type" "credit_account_type",
	"initial_consultation_date" date,
	"credit_education_completed" boolean DEFAULT false NOT NULL,
	"credit_report_review_date" date,
	"main_client_goal" text,
	"status" "credit_case_status" DEFAULT 'new_inquiry' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consulting_service_details" ADD CONSTRAINT "consulting_service_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_service_details" ADD CONSTRAINT "credit_service_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;
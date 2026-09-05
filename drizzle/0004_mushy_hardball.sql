CREATE TYPE "public"."task_status" AS ENUM('open', 'done', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('follow_up', 'payment_check', 'document_reminder', 'closing');--> statement-breakpoint
CREATE TABLE "case_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"previous_status" "case_status",
	"new_status" "case_status" NOT NULL,
	"changed_by_email" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid NOT NULL,
	"case_id" uuid,
	"type" "task_type" NOT NULL,
	"title" text NOT NULL,
	"due_date" date,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"assigned_user_id" uuid,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "assigned_user_id" uuid;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "start_date" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "next_follow_up_date" date;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "documents_requested" text;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "documents_received" text;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "payment_status" "payment_status";--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "referral_source" text;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "next_action" text;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "closed_date" date;--> statement-breakpoint
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
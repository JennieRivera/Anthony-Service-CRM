CREATE TYPE "public"."academy_evaluation_result_status" AS ENUM('not_submitted', 'submitted', 'graded', 'excused');--> statement-breakpoint
CREATE TYPE "public"."academy_evaluation_type" AS ENUM('quiz', 'exam', 'assignment', 'practical', 'final_evaluation', 'other');--> statement-breakpoint
CREATE TABLE "academy_evaluation_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"enrollment_case_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"points_earned" integer,
	"status" "academy_evaluation_result_status" DEFAULT 'not_submitted' NOT NULL,
	"submitted_at" timestamp with time zone,
	"graded_at" timestamp with time zone,
	"notes" text,
	"feedback" text
);
--> statement-breakpoint
CREATE TABLE "academy_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"course_id" uuid NOT NULL,
	"module_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"evaluation_type" "academy_evaluation_type" DEFAULT 'other' NOT NULL,
	"max_points" integer NOT NULL,
	"passing_score" integer,
	"weight_percentage" integer,
	"status" "academy_catalog_status" DEFAULT 'draft' NOT NULL,
	"due_date" date,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "academy_courses" ADD COLUMN "minimum_attendance_percentage" integer;--> statement-breakpoint
ALTER TABLE "academy_courses" ADD COLUMN "minimum_overall_grade" integer;--> statement-breakpoint
ALTER TABLE "academy_courses" ADD COLUMN "require_all_active_modules_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "academy_courses" ADD COLUMN "require_all_evaluations_graded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "academy_evaluation_results" ADD CONSTRAINT "academy_evaluation_results_evaluation_id_academy_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."academy_evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_evaluation_results" ADD CONSTRAINT "academy_evaluation_results_enrollment_case_id_academy_enrollment_details_case_id_fk" FOREIGN KEY ("enrollment_case_id") REFERENCES "public"."academy_enrollment_details"("case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_evaluation_results" ADD CONSTRAINT "academy_evaluation_results_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_evaluations" ADD CONSTRAINT "academy_evaluations_course_id_academy_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."academy_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_evaluations" ADD CONSTRAINT "academy_evaluations_module_id_academy_course_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."academy_course_modules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academy_evaluation_results_evaluation_enrollment_idx" ON "academy_evaluation_results" USING btree ("evaluation_id","enrollment_case_id");
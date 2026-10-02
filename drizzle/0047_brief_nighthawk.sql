CREATE TYPE "public"."academy_attendance_status" AS ENUM('present', 'absent', 'excused', 'late');--> statement-breakpoint
CREATE TYPE "public"."academy_module_progress_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "academy_attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_id" uuid NOT NULL,
	"enrollment_case_id" uuid NOT NULL,
	"attendance_status" "academy_attendance_status" NOT NULL,
	"notes" text,
	"marked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy_attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"course_id" uuid NOT NULL,
	"session_date" date NOT NULL,
	"title" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "academy_student_module_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"enrollment_case_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" "academy_module_progress_status" DEFAULT 'not_started' NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "academy_attendance_records" ADD CONSTRAINT "academy_attendance_records_session_id_academy_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academy_attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_attendance_records" ADD CONSTRAINT "academy_attendance_records_enrollment_case_id_academy_enrollment_details_case_id_fk" FOREIGN KEY ("enrollment_case_id") REFERENCES "public"."academy_enrollment_details"("case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_attendance_sessions" ADD CONSTRAINT "academy_attendance_sessions_course_id_academy_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."academy_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_student_module_progress" ADD CONSTRAINT "academy_student_module_progress_enrollment_case_id_academy_enrollment_details_case_id_fk" FOREIGN KEY ("enrollment_case_id") REFERENCES "public"."academy_enrollment_details"("case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_student_module_progress" ADD CONSTRAINT "academy_student_module_progress_course_id_academy_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."academy_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_student_module_progress" ADD CONSTRAINT "academy_student_module_progress_module_id_academy_course_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."academy_course_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_student_module_progress" ADD CONSTRAINT "academy_student_module_progress_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academy_attendance_records_session_enrollment_idx" ON "academy_attendance_records" USING btree ("session_id","enrollment_case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "academy_student_module_progress_enrollment_module_idx" ON "academy_student_module_progress" USING btree ("enrollment_case_id","module_id");
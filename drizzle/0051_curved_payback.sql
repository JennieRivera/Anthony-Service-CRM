CREATE TYPE "public"."academy_certificate_status" AS ENUM('draft', 'issued', 'revoked');--> statement-breakpoint
CREATE TABLE "academy_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"certificate_seq" serial NOT NULL,
	"certificate_number" text NOT NULL,
	"enrollment_case_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"course_id" uuid,
	"program_id" uuid,
	"student_name_snapshot" text NOT NULL,
	"course_name_snapshot" text NOT NULL,
	"program_name_snapshot" text,
	"status" "academy_certificate_status" DEFAULT 'issued' NOT NULL,
	"issue_date" date NOT NULL,
	"completion_date" date,
	"issued_by" text NOT NULL,
	"notes" text,
	"override_used" boolean DEFAULT false NOT NULL,
	"override_reason" text,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	CONSTRAINT "academy_certificates_certificate_seq_unique" UNIQUE("certificate_seq"),
	CONSTRAINT "academy_certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
ALTER TABLE "academy_certificates" ADD CONSTRAINT "academy_certificates_enrollment_case_id_academy_enrollment_details_case_id_fk" FOREIGN KEY ("enrollment_case_id") REFERENCES "public"."academy_enrollment_details"("case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_certificates" ADD CONSTRAINT "academy_certificates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_certificates" ADD CONSTRAINT "academy_certificates_course_id_academy_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."academy_courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_certificates" ADD CONSTRAINT "academy_certificates_program_id_academy_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."academy_programs"("id") ON DELETE set null ON UPDATE no action;
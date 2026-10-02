CREATE TYPE "public"."academy_catalog_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
ALTER TYPE "public"."course_format" ADD VALUE 'hybrid';--> statement-breakpoint
CREATE TABLE "academy_course_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"module_order" integer DEFAULT 0 NOT NULL,
	"duration_text" text,
	"status" "academy_catalog_status" DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"program_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"format" "course_format" DEFAULT 'live' NOT NULL,
	"status" "academy_catalog_status" DEFAULT 'draft' NOT NULL,
	"duration_text" text,
	"price" numeric(10, 2),
	"certificate_eligible" boolean DEFAULT false NOT NULL,
	"primary_instructor_id" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "academy_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "academy_catalog_status" DEFAULT 'draft' NOT NULL,
	"start_date" date,
	"end_date" date,
	"duration_text" text,
	"certificate_eligible" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "academy_enrollment_details" ADD COLUMN "program_id" uuid;--> statement-breakpoint
ALTER TABLE "academy_enrollment_details" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "academy_course_modules" ADD CONSTRAINT "academy_course_modules_course_id_academy_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."academy_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_courses" ADD CONSTRAINT "academy_courses_program_id_academy_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."academy_programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_courses" ADD CONSTRAINT "academy_courses_primary_instructor_id_academy_instructors_id_fk" FOREIGN KEY ("primary_instructor_id") REFERENCES "public"."academy_instructors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_enrollment_details" ADD CONSTRAINT "academy_enrollment_details_program_id_academy_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."academy_programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_enrollment_details" ADD CONSTRAINT "academy_enrollment_details_course_id_academy_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."academy_courses"("id") ON DELETE set null ON UPDATE no action;
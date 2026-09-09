CREATE TYPE "public"."course_format" AS ENUM('live', 'in_person', 'recorded');--> statement-breakpoint
CREATE TYPE "public"."diamond_member_status" AS ENUM('active', 'paused', 'removed');--> statement-breakpoint
CREATE TYPE "public"."diamond_member_type" AS ENUM('student', 'teacher');--> statement-breakpoint
CREATE TABLE "academy_diamond_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"member_type" "diamond_member_type" NOT NULL,
	"client_id" uuid,
	"case_id" uuid,
	"name" text,
	"phone" text,
	"email" text,
	"joined_date" date DEFAULT now() NOT NULL,
	"status" "diamond_member_status" DEFAULT 'active' NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "academy_enrollment_details" ADD COLUMN "course_format" "course_format";--> statement-breakpoint
ALTER TABLE "academy_diamond_members" ADD CONSTRAINT "academy_diamond_members_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_diamond_members" ADD CONSTRAINT "academy_diamond_members_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;
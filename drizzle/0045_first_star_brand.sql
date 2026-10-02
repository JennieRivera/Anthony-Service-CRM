CREATE TYPE "public"."academy_role_status" AS ENUM('active', 'paused', 'inactive');--> statement-breakpoint
CREATE TABLE "academy_instructors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid,
	"name" text,
	"email" text,
	"phone" text,
	"title" text,
	"specialty" text,
	"bio" text,
	"start_date" date,
	"status" "academy_role_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy_mentors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid,
	"name" text,
	"email" text,
	"phone" text,
	"focus_area" text,
	"notes" text,
	"start_date" date,
	"status" "academy_role_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academy_instructors" ADD CONSTRAINT "academy_instructors_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_mentors" ADD CONSTRAINT "academy_mentors_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
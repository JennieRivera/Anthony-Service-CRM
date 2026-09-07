CREATE TYPE "public"."appointment_type" AS ENUM('in_person', 'phone', 'zoom', 'google_meet', 'virtual', 'mobile_service', 'ron', 'other');--> statement-breakpoint
ALTER TYPE "public"."appointment_status" ADD VALUE 'requested';--> statement-breakpoint
ALTER TYPE "public"."appointment_status" ADD VALUE 'confirmed';--> statement-breakpoint
ALTER TYPE "public"."appointment_status" ADD VALUE 'checked_in';--> statement-breakpoint
ALTER TYPE "public"."appointment_status" ADD VALUE 'in_progress';--> statement-breakpoint
ALTER TYPE "public"."appointment_status" ADD VALUE 'rescheduled';--> statement-breakpoint
CREATE TABLE "service_color_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"color_name" text NOT NULL,
	"color_hex" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "appointment_type" "appointment_type" DEFAULT 'in_person' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "assigned_user_id" uuid;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "referral_source" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "documents_needed" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "payment_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "payment_status" "payment_status";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "created_by_email" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "rescheduled_from_id" uuid;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_rescheduled_from_id_appointments_id_fk" FOREIGN KEY ("rescheduled_from_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;
CREATE TYPE "public"."external_calendar_provider" AS ENUM('google_calendar', 'outlook_calendar', 'highlevel_calendar', 'zoom', 'google_meet');--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "external_calendar_provider" "external_calendar_provider";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "external_calendar_event_id" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "external_sync_status" "integration_sync_status" DEFAULT 'not_connected' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "last_external_sync_at" timestamp with time zone;
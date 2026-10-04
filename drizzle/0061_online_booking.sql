CREATE TABLE "online_booking_blocked_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"date" date NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "online_booking_rate_limit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_hash" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "online_booking_services" (
	"service_type" "service_type" PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bookable" boolean DEFAULT false NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "online_booking_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"weekly_hours" jsonb NOT NULL,
	"slot_interval_minutes" integer DEFAULT 30 NOT NULL,
	"buffer_minutes" integer DEFAULT 15 NOT NULL,
	"min_notice_minutes" integer DEFAULT 120 NOT NULL,
	"max_days_ahead" integer DEFAULT 30 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "source" text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "online_booking_consent_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "online_booking_blocked_dates_date_idx" ON "online_booking_blocked_dates" USING btree ("date");--> statement-breakpoint
CREATE INDEX "online_booking_rate_limit_events_key_occurred_idx" ON "online_booking_rate_limit_events" USING btree ("key_hash","occurred_at");
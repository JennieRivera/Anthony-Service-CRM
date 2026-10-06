ALTER TYPE "public"."task_type" ADD VALUE 'call_client';--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dedupe_key" text NOT NULL,
	"type" text NOT NULL,
	"audience" text NOT NULL,
	"client_id" uuid,
	"appointment_id" uuid,
	"case_id" uuid,
	"channel" text NOT NULL,
	"recipient" text,
	"language" text DEFAULT 'en' NOT NULL,
	"subject" text,
	"body" text,
	"status" text NOT NULL,
	"send_after" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"provider_message_id" text,
	"error" text,
	"test_mode" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_email" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"test_mode" boolean DEFAULT true NOT NULL,
	"test_email" text,
	"test_phone" text,
	"owner_alert_email" text,
	"types" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"precise_reminders" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_texts" (
	"type" text NOT NULL,
	"channel" text NOT NULL,
	"language" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_email" text,
	CONSTRAINT "notification_texts_type_channel_language_pk" PRIMARY KEY("type","channel","language")
);
--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_outbox_dedupe_key_idx" ON "notification_outbox" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "notification_outbox_status_send_after_idx" ON "notification_outbox" USING btree ("status","send_after");--> statement-breakpoint
CREATE INDEX "notification_outbox_client_idx" ON "notification_outbox" USING btree ("client_id");
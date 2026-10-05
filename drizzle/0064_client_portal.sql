ALTER TYPE "public"."task_type" ADD VALUE 'document_review';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'appointment_change_request';--> statement-breakpoint
CREATE TABLE "client_consent_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid,
	"client_name_snapshot" text NOT NULL,
	"appointment_id" uuid,
	"consent_type" text NOT NULL,
	"granted" boolean NOT NULL,
	"source" text NOT NULL,
	"text_shown" text NOT NULL,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "legal_texts" (
	"key" text PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"text_en" text DEFAULT '' NOT NULL,
	"text_es" text DEFAULT '' NOT NULL,
	"updated_by_email" text
);
--> statement-breakpoint
CREATE TABLE "portal_access_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"created_by_email" text
);
--> statement-breakpoint
CREATE TABLE "portal_rate_limit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_hash" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid NOT NULL,
	"link_id" uuid,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "visible_to_client" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "uploaded_by_client" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "sensitive_data_reason" text;--> statement-breakpoint
ALTER TABLE "client_consent_events" ADD CONSTRAINT "client_consent_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_consent_events" ADD CONSTRAINT "client_consent_events_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_access_links" ADD CONSTRAINT "portal_access_links_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_link_id_portal_access_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."portal_access_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_consent_events_client_type_idx" ON "client_consent_events" USING btree ("client_id","consent_type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_access_links_token_hash_idx" ON "portal_access_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "portal_access_links_client_idx" ON "portal_access_links" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "portal_rate_limit_events_key_occurred_idx" ON "portal_rate_limit_events" USING btree ("key_hash","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_sessions_token_hash_idx" ON "portal_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "portal_sessions_client_idx" ON "portal_sessions" USING btree ("client_id");
ALTER TYPE "public"."alliance_document_type" ADD VALUE 'w9';--> statement-breakpoint
ALTER TYPE "public"."alliance_document_type" ADD VALUE 'license';--> statement-breakpoint
ALTER TYPE "public"."alliance_document_type" ADD VALUE 'insurance';--> statement-breakpoint
ALTER TYPE "public"."alliance_document_type" ADD VALUE 'alliance_agreement';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'partner_profile_review';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'partner_document_review';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'partner_marketing_review';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'partner_referral';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'partner_license_expiring';--> statement-breakpoint
CREATE TABLE "marketing_asset_partner_shares" (
	"asset_id" uuid NOT NULL,
	"alliance_id" uuid NOT NULL,
	CONSTRAINT "marketing_asset_partner_shares_asset_id_alliance_id_pk" PRIMARY KEY("asset_id","alliance_id")
);
--> statement-breakpoint
CREATE TABLE "partner_access_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"alliance_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"created_by_email" text,
	"phone_last4_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_consent_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"alliance_id" uuid,
	"alliance_name_snapshot" text NOT NULL,
	"consent_type" text NOT NULL,
	"granted" boolean NOT NULL,
	"text_shown" text NOT NULL,
	"referral_id" uuid,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "partner_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"alliance_id" uuid NOT NULL,
	"blob_url" text NOT NULL,
	"file_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_profiles" (
	"alliance_id" uuid PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text,
	"services_offered" text,
	"service_area" text,
	"social_links" text,
	"logo_blob_url" text,
	"license_number" text,
	"license_expiration" date,
	"insurance_provider" text,
	"insurance_expiration" date
);
--> statement-breakpoint
CREATE TABLE "partner_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"alliance_id" uuid NOT NULL,
	"link_id" uuid,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "alliance_documents" ADD COLUMN "visible_to_partner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "alliance_documents" ADD COLUMN "uploaded_by_partner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "alliance_documents" ADD COLUMN "sensitive_data_reason" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "added_by_alliance_id" uuid;--> statement-breakpoint
ALTER TABLE "marketing_content_assets" ADD COLUMN "partner_share" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "marketing_content_assets" ADD COLUMN "submitted_by_alliance_id" uuid;--> statement-breakpoint
ALTER TABLE "marketing_content_assets" ADD COLUMN "approval_status" text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "partner_note" text;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "partner_service" "service_type";--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "created_by_partner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "partner_contact_name" text;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "partner_contact_phone" text;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "partner_contact_email" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "alliance_id" uuid;--> statement-breakpoint
ALTER TABLE "marketing_asset_partner_shares" ADD CONSTRAINT "marketing_asset_partner_shares_asset_id_marketing_content_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."marketing_content_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_asset_partner_shares" ADD CONSTRAINT "marketing_asset_partner_shares_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_access_links" ADD CONSTRAINT "partner_access_links_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_consent_events" ADD CONSTRAINT "partner_consent_events_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_consent_events" ADD CONSTRAINT "partner_consent_events_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_photos" ADD CONSTRAINT "partner_photos_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_profiles" ADD CONSTRAINT "partner_profiles_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_sessions" ADD CONSTRAINT "partner_sessions_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_sessions" ADD CONSTRAINT "partner_sessions_link_id_partner_access_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."partner_access_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "partner_access_links_token_hash_idx" ON "partner_access_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "partner_access_links_alliance_idx" ON "partner_access_links" USING btree ("alliance_id");--> statement-breakpoint
CREATE INDEX "partner_consent_events_alliance_idx" ON "partner_consent_events" USING btree ("alliance_id","consent_type","created_at");--> statement-breakpoint
CREATE INDEX "partner_photos_alliance_idx" ON "partner_photos" USING btree ("alliance_id");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_sessions_token_hash_idx" ON "partner_sessions" USING btree ("token_hash");--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_added_by_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("added_by_alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_assets" ADD CONSTRAINT "marketing_content_assets_submitted_by_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("submitted_by_alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_or_alliance" CHECK ("tasks"."client_id" is not null or "tasks"."alliance_id" is not null);
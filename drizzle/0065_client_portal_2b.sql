ALTER TYPE "public"."task_type" ADD VALUE 'client_info_review';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'service_interest';--> statement-breakpoint
ALTER TABLE "client_communication_preferences" ADD COLUMN "phone_call_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "client_consent_events" ADD COLUMN "signature_name" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "best_time_to_call" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "photo_blob_url" text;--> statement-breakpoint
ALTER TABLE "portal_access_links" ADD COLUMN "phone_last4_hash" text;
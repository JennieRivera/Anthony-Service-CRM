CREATE TYPE "public"."document_prep_case_status" AS ENUM('new_request', 'documents_pending', 'ready_to_submit', 'submitted', 'processing', 'returned', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."referral_direction" AS ENUM('ams_to_rri', 'rri_to_ams', 'ams_to_other_partner', 'other_partner_to_ams', 'b2b', 'community', 'strategic_alliance');--> statement-breakpoint
CREATE TYPE "public"."referral_pipeline_status" AS ENUM('new_referral', 'registered', 'consent_pending', 'sent_to_partner', 'under_review', 'documents_pending', 'qualified', 'service_in_progress', 'closed_funded', 'commission_due', 'commission_paid', 'declined', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."conversation_channel" ADD VALUE 'youtube';--> statement-breakpoint
ALTER TYPE "public"."conversation_channel" ADD VALUE 'tiktok';--> statement-breakpoint
ALTER TYPE "public"."conversation_channel" ADD VALUE 'linkedin';--> statement-breakpoint
ALTER TABLE "apostille_details" ADD COLUMN "status" "document_prep_case_status" DEFAULT 'new_request' NOT NULL;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "direction" "referral_direction";--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "pipeline_status" "referral_pipeline_status" DEFAULT 'new_referral' NOT NULL;
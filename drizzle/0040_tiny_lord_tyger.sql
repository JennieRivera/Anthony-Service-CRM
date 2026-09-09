CREATE TYPE "public"."social_content_status" AS ENUM('idea', 'draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."social_content_type" AS ENUM('image', 'video', 'reel', 'short', 'story', 'carousel', 'live', 'educational_post', 'promotion', 'testimonial', 'event', 'blog', 'other');--> statement-breakpoint
CREATE TYPE "public"."social_media_platform" AS ENUM('facebook', 'instagram', 'youtube', 'tiktok', 'linkedin', 'website', 'google_business_profile', 'whatsapp_channel', 'other');--> statement-breakpoint
CREATE TYPE "public"."social_partner_approval_status" AS ENUM('not_required', 'pending', 'approved', 'denied');--> statement-breakpoint
CREATE TYPE "public"."social_performance_status" AS ENUM('not_tracked', 'tracking', 'final');--> statement-breakpoint
CREATE TABLE "social_media_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content_seq" serial NOT NULL,
	"title" text NOT NULL,
	"platform" "social_media_platform" NOT NULL,
	"content_type" "social_content_type" NOT NULL,
	"campaign" text,
	"brand" text,
	"service_type" "service_type",
	"audience" text,
	"language" text,
	"caption" text,
	"hashtags" text,
	"call_to_action" text,
	"media_asset_id" uuid,
	"status" "social_content_status" DEFAULT 'idea' NOT NULL,
	"scheduled_date" date,
	"published_date" date,
	"post_url" text,
	"performance_status" "social_performance_status" DEFAULT 'not_tracked' NOT NULL,
	"approval_required" boolean DEFAULT false NOT NULL,
	"approved_by" text,
	"approval_date" date,
	"partner_approval_required" boolean DEFAULT false NOT NULL,
	"partner_approval_status" "social_partner_approval_status" DEFAULT 'not_required' NOT NULL,
	"created_by_email" text,
	"notes" text,
	CONSTRAINT "social_media_content_content_seq_unique" UNIQUE("content_seq")
);
--> statement-breakpoint
ALTER TABLE "social_media_content" ADD CONSTRAINT "social_media_content_media_asset_id_marketing_content_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."marketing_content_assets"("id") ON DELETE set null ON UPDATE no action;
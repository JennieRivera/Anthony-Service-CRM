CREATE TYPE "public"."marketing_channel" AS ENUM('facebook', 'instagram', 'tiktok', 'email', 'whatsapp', 'other');--> statement-breakpoint
CREATE TABLE "marketing_content_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"service_type" "service_type",
	"published_date" date,
	"channel" "marketing_channel",
	"caption" text,
	"file_name" text NOT NULL,
	"blob_url" text NOT NULL
);

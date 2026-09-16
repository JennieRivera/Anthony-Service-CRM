CREATE TYPE "public"."notary_state_guide_status" AS ENUM('verified', 'needs_review', 'unavailable');--> statement-breakpoint
CREATE TABLE "notary_state_guide" (
	"state" text PRIMARY KEY NOT NULL,
	"official_agency" text,
	"official_website" text,
	"commission_link" text,
	"exam_link" text,
	"requirements_link" text,
	"source_url" text,
	"status" "notary_state_guide_status" DEFAULT 'needs_review' NOT NULL,
	"last_verified_date" date,
	"verified_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

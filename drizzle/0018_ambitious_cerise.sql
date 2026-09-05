CREATE TYPE "public"."professional_system_connection_status" AS ENUM('link_only', 'api_available', 'webhook_available', 'connected', 'not_connected', 'error');--> statement-breakpoint
CREATE TYPE "public"."professional_system_integration_type" AS ENUM('external_link', 'api', 'webhook', 'oauth', 'manual', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."website_link_status" AS ENUM('active', 'inactive', 'unknown');--> statement-breakpoint
CREATE TABLE "professional_systems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"url" text,
	"icon" text,
	"description" text,
	"connection_status" "professional_system_connection_status" DEFAULT 'not_connected' NOT NULL,
	"integration_type" "professional_system_integration_type" DEFAULT 'unknown' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"open_in_new_tab" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "professional_systems_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "website_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"status" "website_link_status" DEFAULT 'unknown' NOT NULL,
	"last_checked_at" timestamp with time zone,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "website_links_name_unique" UNIQUE("name")
);

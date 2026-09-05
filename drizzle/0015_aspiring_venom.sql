CREATE TYPE "public"."highlevel_sync_direction" AS ENUM('crm_to_highlevel', 'highlevel_to_crm', 'two_way');--> statement-breakpoint
CREATE TYPE "public"."integration_sync_status" AS ENUM('not_connected', 'ready', 'connected', 'syncing', 'error', 'paused');--> statement-breakpoint
CREATE TABLE "client_highlevel_sync" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"highlevel_contact_id" text,
	"highlevel_opportunity_id" text,
	"highlevel_location_id" text,
	"highlevel_tag" text,
	"highlevel_pipeline" text,
	"sync_status" "integration_sync_status" DEFAULT 'not_connected' NOT NULL,
	"sync_direction" "highlevel_sync_direction",
	"last_sync_at" timestamp with time zone,
	"last_sync_result" text
);
--> statement-breakpoint
CREATE TABLE "integration_settings" (
	"integration_key" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "integration_sync_status" DEFAULT 'not_connected' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"connected_account" text,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "client_highlevel_sync" ADD CONSTRAINT "client_highlevel_sync_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
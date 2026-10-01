CREATE TYPE "public"."alliance_document_type" AS ENUM('contract', 'addendum', 'supporting_document', 'other');--> statement-breakpoint
CREATE TABLE "alliance_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"alliance_id" uuid NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"role" text,
	"phone" text,
	"email" text,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "alliance_documents" ADD COLUMN "document_type" "alliance_document_type";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "alliance_id" uuid;--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD COLUMN "agreement_start_date" date;--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD COLUMN "agreement_renewal_date" date;--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD COLUMN "ams_responsibilities" text;--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD COLUMN "partner_responsibilities" text;--> statement-breakpoint
ALTER TABLE "alliance_contacts" ADD CONSTRAINT "alliance_contacts_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alliance_contacts" ADD CONSTRAINT "alliance_contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE set null ON UPDATE no action;
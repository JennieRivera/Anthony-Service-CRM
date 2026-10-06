ALTER TYPE "public"."organization_type" ADD VALUE 'installer_remodeling';--> statement-breakpoint
CREATE TABLE "partner_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"alliance_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"service_area" text,
	"price_from" numeric(12, 2)
);
--> statement-breakpoint
ALTER TABLE "partner_services" ADD CONSTRAINT "partner_services_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_services_alliance_idx" ON "partner_services" USING btree ("alliance_id");
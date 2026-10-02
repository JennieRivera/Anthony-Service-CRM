CREATE TABLE "alliance_network_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"referring_alliance_id" uuid NOT NULL,
	"introduced_alliance_id" uuid NOT NULL,
	"relationship_date" date,
	"notes" text,
	"recorded_by_email" text
);
--> statement-breakpoint
ALTER TABLE "alliance_network_relationships" ADD CONSTRAINT "alliance_network_relationships_referring_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("referring_alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alliance_network_relationships" ADD CONSTRAINT "alliance_network_relationships_introduced_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("introduced_alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alliance_network_relationships_unique_pair" ON "alliance_network_relationships" USING btree ("referring_alliance_id","introduced_alliance_id");
ALTER TYPE "public"."organization_type" ADD VALUE 'contractor_remodeling';--> statement-breakpoint
ALTER TYPE "public"."organization_type" ADD VALUE 'chef_culinary';--> statement-breakpoint
CREATE TABLE "corporate_event_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"alliance_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "corporate_event_details" ADD CONSTRAINT "corporate_event_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_event_details" ADD CONSTRAINT "corporate_event_details_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE set null ON UPDATE no action;
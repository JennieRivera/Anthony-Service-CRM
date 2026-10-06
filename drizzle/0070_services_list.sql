ALTER TYPE "public"."service_type" ADD VALUE 'crm_technology';--> statement-breakpoint
ALTER TYPE "public"."service_type" ADD VALUE 'corporate_events';--> statement-breakpoint
ALTER TYPE "public"."service_type" ADD VALUE 'remodeling';--> statement-breakpoint
CREATE TABLE "remodeling_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"alliance_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "remodeling_details" ADD CONSTRAINT "remodeling_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remodeling_details" ADD CONSTRAINT "remodeling_details_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE set null ON UPDATE no action;
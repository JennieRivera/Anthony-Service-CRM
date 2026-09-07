CREATE TABLE "alliance_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"alliance_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"blob_url" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "alliance_id" uuid;--> statement-breakpoint
ALTER TABLE "alliance_documents" ADD CONSTRAINT "alliance_documents_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE set null ON UPDATE no action;
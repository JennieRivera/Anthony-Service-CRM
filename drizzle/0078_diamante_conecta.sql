ALTER TYPE "public"."task_type" ADD VALUE 'partner_application_review';--> statement-breakpoint
CREATE TABLE "partner_email_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"purpose" text NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"used_at" timestamp with time zone,
	"alliance_id" uuid,
	"payload" jsonb
);
--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD COLUMN "email_login_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD COLUMN "applied_via_conecta" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_email_codes" ADD CONSTRAINT "partner_email_codes_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_email_codes_email_idx" ON "partner_email_codes" USING btree ("email","purpose","created_at");
CREATE TABLE "miadiamante_rate_limit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_email" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "miadiamante_rate_limit_events_owner_occurred_idx" ON "miadiamante_rate_limit_events" USING btree ("owner_email","occurred_at");
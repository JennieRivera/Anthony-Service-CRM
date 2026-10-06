ALTER TYPE "public"."conversation_channel" ADD VALUE 'google_business';--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "call_outcome" text;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "google_kind" text;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "review_stars" integer;
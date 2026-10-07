ALTER TYPE "public"."task_type" ADD VALUE 'partner_meeting_request';--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "partner_visible" boolean DEFAULT false NOT NULL;
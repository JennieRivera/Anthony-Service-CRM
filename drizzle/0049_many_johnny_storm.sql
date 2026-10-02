ALTER TYPE "public"."ai_activity_outcome" ADD VALUE 'denied';--> statement-breakpoint
ALTER TYPE "public"."ai_module_key" ADD VALUE 'diamond_community';--> statement-breakpoint
ALTER TYPE "public"."ai_module_key" ADD VALUE 'b2b_alliances';--> statement-breakpoint
ALTER TYPE "public"."ai_module_key" ADD VALUE 'academy_records';--> statement-breakpoint
ALTER TABLE "ai_activity_log" ADD COLUMN "module_key" "ai_module_key";--> statement-breakpoint
ALTER TABLE "ai_activity_log" ADD COLUMN "human_approver_email" text;--> statement-breakpoint
ALTER TABLE "ai_escalations" ADD COLUMN "assigned_human_user_id" uuid;--> statement-breakpoint
ALTER TABLE "ai_escalations" ADD CONSTRAINT "ai_escalations_assigned_human_user_id_users_id_fk" FOREIGN KEY ("assigned_human_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
CREATE TYPE "public"."conversation_status" AS ENUM('new', 'read', 'replied', 'pending_follow_up', 'completed', 'archived');--> statement-breakpoint
ALTER TYPE "public"."conversation_channel" ADD VALUE 'sms';--> statement-breakpoint
ALTER TYPE "public"."conversation_channel" ADD VALUE 'facebook_messenger';--> statement-breakpoint
ALTER TYPE "public"."conversation_channel" ADD VALUE 'instagram_dm';--> statement-breakpoint
ALTER TYPE "public"."conversation_channel" ADD VALUE 'website_chat';--> statement-breakpoint
ALTER TYPE "public"."conversation_channel" ADD VALUE 'highlevel';--> statement-breakpoint
ALTER TYPE "public"."conversation_channel" ADD VALUE 'in_person';--> statement-breakpoint
ALTER TYPE "public"."conversation_channel" ADD VALUE 'other';--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "communication_seq" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "business_name" text;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "referral_id" uuid;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "task_id" uuid;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "assigned_user_id" uuid;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "full_message" text;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "follow_up_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "follow_up_date" date;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "status" "conversation_status" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "created_by_email" text;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_communication_seq_unique" UNIQUE("communication_seq");
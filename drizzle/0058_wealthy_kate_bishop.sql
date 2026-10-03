CREATE TYPE "public"."miadiamante_conversation_status" AS ENUM('active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."miadiamante_message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "miadiamante_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_email" text NOT NULL,
	"owner_user_id" uuid,
	"title" text,
	"status" "miadiamante_conversation_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "miadiamante_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "miadiamante_message_role" NOT NULL,
	"content" text NOT NULL,
	"tool_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "miadiamante_conversations" ADD CONSTRAINT "miadiamante_conversations_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "miadiamante_messages" ADD CONSTRAINT "miadiamante_messages_conversation_id_miadiamante_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."miadiamante_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "miadiamante_conversations_owner_email_idx" ON "miadiamante_conversations" USING btree ("owner_email");--> statement-breakpoint
CREATE INDEX "miadiamante_messages_conversation_created_idx" ON "miadiamante_messages" USING btree ("conversation_id","created_at");
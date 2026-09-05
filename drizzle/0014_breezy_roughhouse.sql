CREATE TYPE "public"."meta_channel_status" AS ENUM('not_connected', 'connected', 'consent_pending', 'active', 'opted_out');--> statement-breakpoint
CREATE TYPE "public"."website_source" AS ENUM('anthonyservice_com', 'anthonyfinancial360_com', 'anthonymultiservice_net', 'anthonymultiserviceacademy_ai', 'other');--> statement-breakpoint
CREATE TABLE "facebook_messenger_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid,
	"case_id" uuid,
	"facebook_profile" text,
	"status" "meta_channel_status" DEFAULT 'not_connected' NOT NULL,
	"last_message_at" timestamp with time zone,
	"assigned_user_id" uuid,
	"follow_up_date" date
);
--> statement-breakpoint
CREATE TABLE "instagram_dm_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid,
	"case_id" uuid,
	"instagram_username" text,
	"status" "meta_channel_status" DEFAULT 'not_connected' NOT NULL,
	"last_message_at" timestamp with time zone,
	"assigned_user_id" uuid,
	"follow_up_date" date
);
--> statement-breakpoint
CREATE TABLE "website_chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" uuid,
	"website_source" "website_source" NOT NULL,
	"visitor_name" text,
	"visitor_email" text,
	"visitor_phone" text,
	"language" text,
	"service_interest" "service_type",
	"message" text NOT NULL,
	"conversation_status" "conversation_status" DEFAULT 'new' NOT NULL,
	"assigned_user_id" uuid,
	"follow_up_date" date
);
--> statement-breakpoint
ALTER TABLE "facebook_messenger_threads" ADD CONSTRAINT "facebook_messenger_threads_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facebook_messenger_threads" ADD CONSTRAINT "facebook_messenger_threads_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facebook_messenger_threads" ADD CONSTRAINT "facebook_messenger_threads_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_dm_threads" ADD CONSTRAINT "instagram_dm_threads_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_dm_threads" ADD CONSTRAINT "instagram_dm_threads_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_dm_threads" ADD CONSTRAINT "instagram_dm_threads_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_chat_sessions" ADD CONSTRAINT "website_chat_sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_chat_sessions" ADD CONSTRAINT "website_chat_sessions_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
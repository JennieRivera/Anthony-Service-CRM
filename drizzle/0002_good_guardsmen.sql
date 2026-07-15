CREATE TYPE "public"."conversation_channel" AS ENUM('email', 'call', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."conversation_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"client_id" uuid NOT NULL,
	"case_id" uuid,
	"channel" "conversation_channel" NOT NULL,
	"direction" "conversation_direction" NOT NULL,
	"subject" text,
	"summary" text NOT NULL,
	"duration_minutes" integer,
	"counterpart" text,
	"external_id" text,
	"logged_by" uuid
);
--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
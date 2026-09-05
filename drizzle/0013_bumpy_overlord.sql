CREATE TYPE "public"."email_contact_status" AS ENUM('active', 'unsubscribed', 'bounced', 'invalid', 'consent_pending');--> statement-breakpoint
CREATE TYPE "public"."sms_contact_status" AS ENUM('active', 'opted_out', 'invalid', 'consent_pending');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_contact_status" AS ENUM('not_connected', 'connected', 'consent_pending', 'active', 'opted_out');--> statement-breakpoint
CREATE TABLE "client_communication_preferences" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"preferred_channel" "conversation_channel",
	"email_consent" boolean DEFAULT false NOT NULL,
	"sms_consent" boolean DEFAULT false NOT NULL,
	"whatsapp_consent" boolean DEFAULT false NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"partner_referral_consent" boolean DEFAULT false NOT NULL,
	"consent_date" date,
	"consent_source" text,
	"opt_out_date" date,
	"whatsapp_number" text,
	"whatsapp_contact_status" "whatsapp_contact_status" DEFAULT 'not_connected' NOT NULL,
	"last_whatsapp_message_at" timestamp with time zone,
	"next_whatsapp_follow_up_date" date,
	"whatsapp_template_used" text,
	"email_status" "email_contact_status" DEFAULT 'consent_pending' NOT NULL,
	"last_email_sent_at" timestamp with time zone,
	"last_email_received_at" timestamp with time zone,
	"last_email_subject" text,
	"email_template_used" text,
	"next_email_follow_up_date" date,
	"sms_status" "sms_contact_status" DEFAULT 'consent_pending' NOT NULL,
	"last_sms_sent_at" timestamp with time zone,
	"last_sms_received_at" timestamp with time zone,
	"sms_template_used" text,
	"next_sms_follow_up_date" date
);
--> statement-breakpoint
ALTER TABLE "client_communication_preferences" ADD CONSTRAINT "client_communication_preferences_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
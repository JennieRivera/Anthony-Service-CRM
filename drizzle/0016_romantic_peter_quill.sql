CREATE TYPE "public"."message_template_category" AS ENUM('welcome', 'appointment_confirmation', 'appointment_reminder', 'documents_requested', 'documents_missing', 'payment_reminder', 'invoice_sent', 'payment_received', 'service_update', 'referral_update', 'rri_referral_update', 'follow_up', 'thank_you', 'review_request', 'academy_welcome', 'academy_reminder', 'partner_communication');--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"language" text NOT NULL,
	"channel" "conversation_channel" NOT NULL,
	"category" "message_template_category" NOT NULL,
	"subject" text,
	"message_body" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by_email" text
);

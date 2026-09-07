CREATE TYPE "public"."ai_activity_action" AS ENUM('create_task', 'create_note', 'create_reminder', 'classify_service', 'draft_message', 'change_status', 'send_draft', 'send_message', 'escalate', 'other');--> statement-breakpoint
CREATE TYPE "public"."ai_activity_outcome" AS ENUM('success', 'failed', 'pending_approval');--> statement-breakpoint
CREATE TYPE "public"."ai_agent_avatar_style" AS ENUM('human', 'robot');--> statement-breakpoint
CREATE TYPE "public"."ai_agent_department" AS ENUM('client_service', 'tax_bookkeeping', 'commercial_finance', 'immigration', 'document_services', 'business_consulting', 'community_academy', 'operations');--> statement-breakpoint
CREATE TYPE "public"."ai_agent_language" AS ENUM('en', 'es', 'bilingual');--> statement-breakpoint
CREATE TYPE "public"."ai_agent_launch_status" AS ENUM('active', 'coming_soon');--> statement-breakpoint
CREATE TYPE "public"."ai_agent_status" AS ENUM('online', 'offline', 'paused', 'needs_review', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."ai_approval_level" AS ENUM('level_1_automatic', 'level_2_human_review', 'level_3_human_only');--> statement-breakpoint
CREATE TYPE "public"."ai_escalation_risk_level" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."ai_escalation_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."ai_knowledge_base_section" AS ENUM('approved_services', 'approved_scripts', 'faqs', 'policies', 'disclaimers', 'checklists', 'workflows', 'forms', 'official_resources', 'escalation_rules', 'prohibited_actions');--> statement-breakpoint
CREATE TYPE "public"."ai_module_key" AS ENUM('clients', 'client_360_basic', 'client_basic_profile', 'services', 'appointments', 'tasks', 'communications', 'lead_referral_source', 'full_financial_records', 'tax_return_details', 'sensitive_immigration_files', 'banking_data', 'full_commission_details', 'admin_settings', 'system_credentials', 'tax_records', 'bookkeeping_records', 'document_status', 'payment_status', 'client_business_profile', 'company_registry_limited_fields', 'company_registry', 'company_registry_business_profile', 'referral_records', 'commercial_finance_module', 'referral_commission_records', 'commission_payment_status_basic', 'immigration_admin_service_records', 'immigration_forms_library', 'uscis_official_resources', 'authorized_client_document_folders', 'document_prep_records');--> statement-breakpoint
CREATE TABLE "ai_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"agent_id" uuid,
	"client_id" uuid,
	"case_id" uuid,
	"action" "ai_activity_action" NOT NULL,
	"action_detail" text,
	"previous_value" text,
	"new_value" text,
	"approval_level" "ai_approval_level" DEFAULT 'level_1_automatic' NOT NULL,
	"requires_human_approval" boolean DEFAULT false NOT NULL,
	"human_approved" boolean,
	"outcome" "ai_activity_outcome" DEFAULT 'success' NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "ai_agent_knowledge_base" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"agent_id" uuid NOT NULL,
	"section" "ai_knowledge_base_section" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"department" "ai_agent_department" NOT NULL,
	"language" "ai_agent_language" DEFAULT 'bilingual' NOT NULL,
	"status" "ai_agent_status" DEFAULT 'offline' NOT NULL,
	"launch_status" "ai_agent_launch_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"avatar_url" text,
	"avatar_style" "ai_agent_avatar_style" DEFAULT 'robot' NOT NULL,
	"accent_color" text,
	"voice_enabled" boolean DEFAULT false NOT NULL,
	"video_avatar_enabled" boolean DEFAULT false NOT NULL,
	"bio" text,
	"welcome_message" text,
	"disclaimer_text" text,
	"can_read" boolean DEFAULT true NOT NULL,
	"can_write" boolean DEFAULT false NOT NULL,
	"can_create_task" boolean DEFAULT true NOT NULL,
	"can_create_note" boolean DEFAULT true NOT NULL,
	"can_change_status" boolean DEFAULT false NOT NULL,
	"can_send_draft" boolean DEFAULT true NOT NULL,
	"can_send_message" boolean DEFAULT false NOT NULL,
	"can_escalate" boolean DEFAULT true NOT NULL,
	"allowed_modules" "ai_module_key"[],
	"denied_modules" "ai_module_key"[],
	CONSTRAINT "ai_agents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ai_escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escalation_seq" serial NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"agent_id" uuid,
	"client_id" uuid,
	"case_id" uuid,
	"reason" text NOT NULL,
	"risk_level" "ai_escalation_risk_level" DEFAULT 'medium' NOT NULL,
	"status" "ai_escalation_status" DEFAULT 'open' NOT NULL,
	"assigned_human_email" text,
	"resolution" text,
	"resolution_date" date,
	CONSTRAINT "ai_escalations_escalation_seq_unique" UNIQUE("escalation_seq")
);
--> statement-breakpoint
ALTER TABLE "ai_activity_log" ADD CONSTRAINT "ai_activity_log_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_activity_log" ADD CONSTRAINT "ai_activity_log_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_activity_log" ADD CONSTRAINT "ai_activity_log_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_knowledge_base" ADD CONSTRAINT "ai_agent_knowledge_base_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_escalations" ADD CONSTRAINT "ai_escalations_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_escalations" ADD CONSTRAINT "ai_escalations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_escalations" ADD CONSTRAINT "ai_escalations_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;
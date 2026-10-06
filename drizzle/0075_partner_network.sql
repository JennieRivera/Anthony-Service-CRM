ALTER TYPE "public"."task_type" ADD VALUE 'partner_referral_assign';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'partner_network_review';--> statement-breakpoint
CREATE TABLE "partner_contact_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contact_id" uuid NOT NULL,
	"owner_alliance_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"blob_url" text NOT NULL,
	"sensitive_data_reason" text
);
--> statement-breakpoint
CREATE TABLE "partner_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_alliance_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"business_name" text,
	"phone" text,
	"email" text,
	"services" text,
	"note" text,
	"client_id" uuid,
	"referral_id" uuid,
	"introduced_alliance_id" uuid
);
--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "network_routing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "requested_service" text;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "assigned_alliance_id" uuid;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "assignee_note" text;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "show_assignee_to_sender" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD COLUMN "added_by_alliance_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "referral_id" uuid;--> statement-breakpoint
ALTER TABLE "partner_contact_documents" ADD CONSTRAINT "partner_contact_documents_contact_id_partner_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."partner_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_contact_documents" ADD CONSTRAINT "partner_contact_documents_owner_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("owner_alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_contacts" ADD CONSTRAINT "partner_contacts_owner_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("owner_alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_contacts" ADD CONSTRAINT "partner_contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_contacts" ADD CONSTRAINT "partner_contacts_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_contacts" ADD CONSTRAINT "partner_contacts_introduced_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("introduced_alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_contact_documents_contact_idx" ON "partner_contact_documents" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "partner_contacts_owner_idx" ON "partner_contacts" USING btree ("owner_alliance_id","created_at");--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_assigned_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("assigned_alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD CONSTRAINT "strategic_alliances_added_by_alliance_id_strategic_alliances_id_fk" FOREIGN KEY ("added_by_alliance_id") REFERENCES "public"."strategic_alliances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE set null ON UPDATE no action;
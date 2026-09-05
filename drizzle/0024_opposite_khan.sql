CREATE TYPE "public"."association_organization_type" AS ENUM('latino_chamber', 'chamber_of_commerce', 'business_association', 'professional_association', 'community_organization', 'faith_based_organization', 'other');--> statement-breakpoint
CREATE TYPE "public"."association_relationship_status" AS ENUM('research', 'prospect', 'contacted', 'meeting_scheduled', 'member', 'strategic_partner', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."latino_opportunity_score" AS ENUM('very_high', 'high', 'medium', 'emerging', 'insufficient_data');--> statement-breakpoint
CREATE TABLE "associations_chambers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_name" text NOT NULL,
	"organization_type" "association_organization_type" DEFAULT 'other' NOT NULL,
	"state" text,
	"city" text,
	"country" text,
	"website" text,
	"phone" text,
	"email" text,
	"contact_person" text,
	"industry_focus" text,
	"latino_focus" boolean DEFAULT false NOT NULL,
	"membership_status" text,
	"membership_cost" text,
	"ams_relationship_status" "association_relationship_status" DEFAULT 'research' NOT NULL,
	"date_contacted" date,
	"last_contact" date,
	"next_follow_up" date,
	"partnership_opportunity" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "latino_business_opportunity_data" (
	"state" text PRIMARY KEY NOT NULL,
	"estimated_latino_population" integer,
	"estimated_latino_business_presence" integer,
	"top_industries" text,
	"ams_clients_count" integer,
	"ams_leads_count" integer,
	"revenue_from_state" numeric(12, 2),
	"opportunity_score" "latino_opportunity_score" DEFAULT 'insufficient_data' NOT NULL,
	"potential_services" text,
	"expansion_notes" text,
	"notes" text,
	"source_name" text,
	"source_url" text,
	"source_year" integer,
	"source_last_updated" date,
	"source_data_type" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

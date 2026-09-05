ALTER TYPE "public"."user_role" ADD VALUE 'immigration_staff';--> statement-breakpoint
ALTER TABLE "associations_chambers" ADD COLUMN "last_verified_date" date;--> statement-breakpoint
ALTER TABLE "associations_chambers" ADD COLUMN "verified_by" text;--> statement-breakpoint
ALTER TABLE "associations_chambers" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "immigration_forms" ADD COLUMN "verified_by" text;--> statement-breakpoint
ALTER TABLE "irs_resources" ADD COLUMN "verified_by" text;--> statement-breakpoint
ALTER TABLE "latino_business_opportunity_data" ADD COLUMN "verified_by" text;--> statement-breakpoint
ALTER TABLE "sales_tax_state_info" ADD COLUMN "verified_by" text;
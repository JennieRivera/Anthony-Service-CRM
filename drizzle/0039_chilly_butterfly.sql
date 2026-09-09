ALTER TYPE "public"."alliance_status" ADD VALUE 'member';--> statement-breakpoint
ALTER TYPE "public"."organization_type" ADD VALUE 'business_association';--> statement-breakpoint
ALTER TYPE "public"."organization_type" ADD VALUE 'latino_association';--> statement-breakpoint
ALTER TYPE "public"."organization_type" ADD VALUE 'referral_partner';--> statement-breakpoint
ALTER TYPE "public"."organization_type" ADD VALUE 'training_partner';--> statement-breakpoint
ALTER TYPE "public"."organization_type" ADD VALUE 'university';--> statement-breakpoint
ALTER TYPE "public"."organization_type" ADD VALUE 'business_organization';--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD COLUMN "city" text;
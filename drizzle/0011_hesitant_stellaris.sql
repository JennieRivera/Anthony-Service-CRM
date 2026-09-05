CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'tax_staff', 'bookkeeping_staff', 'notary_staff', 'consulting_staff', 'academy_staff', 'referral_manager', 'community_manager');--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'inactivity_alert';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role";
ALTER TABLE "clients" ADD COLUMN "folder_number" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "referral_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE set null ON UPDATE no action;
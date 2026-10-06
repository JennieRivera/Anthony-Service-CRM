ALTER TABLE "referrals" ADD COLUMN "direct_referral" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD COLUMN "directory_access" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD COLUMN "directory_listed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD COLUMN "directory_opt_in" boolean DEFAULT false NOT NULL;
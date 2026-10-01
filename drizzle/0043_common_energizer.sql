ALTER TYPE "public"."diamond_member_type" ADD VALUE 'instructor';--> statement-breakpoint
ALTER TYPE "public"."diamond_member_type" ADD VALUE 'mentor';--> statement-breakpoint
ALTER TYPE "public"."diamond_member_type" ADD VALUE 'mentee';--> statement-breakpoint
ALTER TABLE "academy_diamond_members" ADD COLUMN "teacher_client_id" uuid;--> statement-breakpoint
ALTER TABLE "associations_chambers" ADD COLUMN "contact_client_id" uuid;--> statement-breakpoint
ALTER TABLE "associations_chambers" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "business_formation_details" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD COLUMN "contact_client_id" uuid;--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "academy_diamond_members" ADD CONSTRAINT "academy_diamond_members_teacher_client_id_clients_id_fk" FOREIGN KEY ("teacher_client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "associations_chambers" ADD CONSTRAINT "associations_chambers_contact_client_id_clients_id_fk" FOREIGN KEY ("contact_client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "associations_chambers" ADD CONSTRAINT "associations_chambers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_formation_details" ADD CONSTRAINT "business_formation_details_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD CONSTRAINT "strategic_alliances_contact_client_id_clients_id_fk" FOREIGN KEY ("contact_client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategic_alliances" ADD CONSTRAINT "strategic_alliances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
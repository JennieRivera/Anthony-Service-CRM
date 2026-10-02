ALTER TYPE "public"."user_role" ADD VALUE 'super_admin';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'instructor';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'general_staff';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "instructor_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_instructor_id_academy_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."academy_instructors"("id") ON DELETE set null ON UPDATE no action;
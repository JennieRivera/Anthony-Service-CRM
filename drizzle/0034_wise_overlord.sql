ALTER TYPE "public"."task_type" ADD VALUE 'appointment_confirmation';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'appointment_reminder';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "appointment_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;
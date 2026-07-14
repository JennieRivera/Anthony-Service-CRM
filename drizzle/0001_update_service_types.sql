-- Replaces the service_type catalog with the business's new 6-service lineup:
-- online_notary, document_prep, tax_prep, company_registration, credit_financing, leadership
--
-- Existing rows using retired values are remapped so no data is lost:
--   notary, mobile_notary, apostille, immigration  ->  document_prep
--
-- Historical notary journal entries (notary_log_entries) and apostille details
-- (apostille_details) are NOT affected by this migration — they stay linked to
-- their case by case_id and will still display on the case page regardless of
-- the case's new service_type label.

ALTER TYPE "public"."service_type" RENAME TO "service_type_old";--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('online_notary', 'document_prep', 'tax_prep', 'company_registration', 'credit_financing', 'leadership');--> statement-breakpoint

-- Postgres rejects a subquery inside an ALTER COLUMN TYPE ... USING expression
-- ("cannot use subquery in transform expression"), so the array column is
-- converted via an add/backfill/drop-and-rename instead of an in-place USING cast.
ALTER TABLE "clients" ADD COLUMN "interested_services_new" "public"."service_type"[];--> statement-breakpoint

UPDATE "clients" SET "interested_services_new" = (
	SELECT array_agg(
		(
			CASE elem::text
				WHEN 'notary' THEN 'document_prep'
				WHEN 'mobile_notary' THEN 'document_prep'
				WHEN 'apostille' THEN 'document_prep'
				WHEN 'immigration' THEN 'document_prep'
				ELSE elem::text
			END
		)::"public"."service_type"
	)
	FROM unnest("interested_services") AS elem
) WHERE "interested_services" IS NOT NULL;--> statement-breakpoint

ALTER TABLE "clients" DROP COLUMN "interested_services";--> statement-breakpoint
ALTER TABLE "clients" RENAME COLUMN "interested_services_new" TO "interested_services";--> statement-breakpoint

ALTER TABLE "cases" ALTER COLUMN "service_type" TYPE "public"."service_type" USING (
	(
		CASE "service_type"::text
			WHEN 'notary' THEN 'document_prep'
			WHEN 'mobile_notary' THEN 'document_prep'
			WHEN 'apostille' THEN 'document_prep'
			WHEN 'immigration' THEN 'document_prep'
			ELSE "service_type"::text
		END
	)::"public"."service_type"
);--> statement-breakpoint

ALTER TABLE "appointments" ALTER COLUMN "service_type" TYPE "public"."service_type" USING (
	(
		CASE "service_type"::text
			WHEN 'notary' THEN 'document_prep'
			WHEN 'mobile_notary' THEN 'document_prep'
			WHEN 'apostille' THEN 'document_prep'
			WHEN 'immigration' THEN 'document_prep'
			ELSE "service_type"::text
		END
	)::"public"."service_type"
);--> statement-breakpoint

DROP TYPE "public"."service_type_old";

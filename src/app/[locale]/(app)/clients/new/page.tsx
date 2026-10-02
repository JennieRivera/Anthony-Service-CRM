import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ClientForm } from "@/components/clients/ClientForm";
import { listCompaniesForSelect } from "@/lib/queries/companies";
import { isBlobConfigured } from "@/lib/blob/config";
import {
  createClientAction,
  createClientAndContinueToEnrollmentAction,
  createClientForUploadAction,
} from "../actions";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceType?: string }>;
}) {
  const t = await getTranslations("Clients");
  const tAcademy = await getTranslations("Academy");
  const companies = await listCompaniesForSelect();
  const blobConfigured = isBlobConfigured();
  const { serviceType } = await searchParams;
  // Phase 2A — Academy New Student flow. `/clients/new?serviceType=academy`
  // is reached from the "This Is a New Person" path on /academy/new-student
  // (after staff has already searched and found no existing match) — saving
  // continues straight into Academy enrollment instead of the plain client
  // profile.
  const isAcademyIntent = serviceType === "academy";

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("newClient")}
        </h1>
        <Link
          href={isAcademyIntent ? "/academy/new-student" : "/clients"}
          className="text-sm text-muted-foreground underline"
        >
          &larr;{" "}
          {isAcademyIntent ? tAcademy("backToStudentSearch") : t("backToClients")}
        </Link>
      </div>

      <ClientForm
        companies={companies}
        onSubmit={isAcademyIntent ? createClientAndContinueToEnrollmentAction : createClientAction}
        onCreateWithDocument={blobConfigured ? createClientForUploadAction : undefined}
        academyContext={isAcademyIntent}
      />
    </div>
  );
}

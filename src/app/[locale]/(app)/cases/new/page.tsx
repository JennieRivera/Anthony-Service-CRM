import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CaseForm } from "@/components/cases/CaseForm";
import { listClientsForSelect } from "@/lib/queries/cases";
import { listCompaniesForSelect } from "@/lib/queries/companies";
import { serviceTypeValues } from "@/lib/validation/client";
import { createCaseAction } from "../actions";

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; serviceType?: string }>;
}) {
  const t = await getTranslations("Cases");
  const tAcademy = await getTranslations("Academy");
  const { clientId, serviceType } = await searchParams;
  const isAcademy = serviceType === "academy";
  const validServiceType = (serviceTypeValues as readonly string[]).includes(
    serviceType ?? "",
  )
    ? (serviceType as (typeof serviceTypeValues)[number])
    : undefined;
  const [clients, companies] = await Promise.all([
    listClientsForSelect(),
    listCompaniesForSelect(),
  ]);

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {isAcademy ? tAcademy("newStudent") : t("newCase")}
        </h1>
        <Link
          href={isAcademy ? "/academy" : "/cases"}
          className="text-sm text-muted-foreground underline"
        >
          &larr; {isAcademy ? tAcademy("backToAcademy") : t("backToCases")}
        </Link>
      </div>

      <CaseForm
        clients={clients}
        companies={companies}
        defaultClientId={clientId}
        defaultServiceType={validServiceType}
        onSubmit={createCaseAction}
      />
    </div>
  );
}

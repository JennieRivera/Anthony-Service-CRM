import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CaseForm } from "@/components/cases/CaseForm";
import { listClientsForSelect } from "@/lib/queries/cases";
import { listCompaniesForSelect } from "@/lib/queries/companies";
import { listActiveServiceCatalogItems } from "@/lib/queries/serviceCatalog";
import { listSelectableAcademyPrograms } from "@/lib/queries/academyPrograms";
import { listSelectableAcademyCourses } from "@/lib/queries/academyCourses";
import { activeServiceTypeValues } from "@/lib/validation/client";
import { listAlliancesForSelect } from "@/lib/queries/alliances";
import { Button } from "@/components/ui/button";
import { createCaseAction } from "../actions";

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; serviceType?: string; choose?: string }>;
}) {
  const t = await getTranslations("Cases");
  const tAcademy = await getTranslations("Academy");
  const tService = await getTranslations("ServiceType");
  const { clientId, serviceType, choose } = await searchParams;
  const isAcademy = serviceType === "academy";
  // Only current services can be preselected (never the legacy ones).
  const validServiceType = activeServiceTypeValues.find((s) => s === serviceType);

  // Services menu → "Notary Public & Documents": a two-button chooser, no
  // default, so a case never lands in the wrong type.
  if (choose === "notary_documents" && !validServiceType) {
    const query = (s: string) => `/cases/new?serviceType=${s}${clientId ? `&clientId=${clientId}` : ""}`;
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl text-foreground">{t("newCase")}</h1>
          <Link href="/cases" className="text-sm text-muted-foreground underline">
            &larr; {t("backToCases")}
          </Link>
        </div>
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
          <p className="text-foreground">{t("chooseNotaryOrDocuments")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["notary", "document_prep"] as const).map((s) => (
              <Button key={s} size="lg" variant="outline" className="h-auto py-4 whitespace-normal" render={<Link href={query(s)} />}>
                {tService(s)}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  const [clients, companies, serviceCatalogItems, academyPrograms, academyCourses, alliances] =
    await Promise.all([
      listClientsForSelect(),
      listCompaniesForSelect(),
      listActiveServiceCatalogItems(),
      isAcademy ? listSelectableAcademyPrograms() : Promise.resolve([]),
      isAcademy ? listSelectableAcademyCourses() : Promise.resolve([]),
      listAlliancesForSelect(),
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
        serviceCatalogItems={serviceCatalogItems}
        academyPrograms={academyPrograms}
        academyCourses={academyCourses}
        defaultClientId={clientId}
        defaultServiceType={validServiceType}
        alliances={alliances}
        onSubmit={createCaseAction}
      />
    </div>
  );
}

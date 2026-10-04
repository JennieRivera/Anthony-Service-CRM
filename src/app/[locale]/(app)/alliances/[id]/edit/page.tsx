import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAllianceById } from "@/lib/queries/alliances";
import { listClientsForSelect } from "@/lib/queries/clients";
import { listCompaniesForSelect } from "@/lib/queries/companies";
import { Link } from "@/i18n/navigation";
import { AllianceForm } from "@/components/alliances/AllianceForm";
import { updateAllianceAction } from "../../actions";
import type { AllianceFormValues } from "@/lib/validation/alliance";
import AccessDenied from "@/components/AccessDenied";
import { getCurrentRole, hasAccessArea, requireAccessArea } from "@/lib/permissions";

export default async function EditAlliancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Alliances");

  const role = await getCurrentRole();
  if (!role || !hasAccessArea(role, "alliances")) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("editAlliance")}</h1>
        <AccessDenied />
      </div>
    );
  }

  const [result, clients, companies] = await Promise.all([
    getAllianceById(id),
    listClientsForSelect(),
    listCompaniesForSelect(),
  ]);
  if (!result) notFound();

  async function submit(values: AllianceFormValues) {
    "use server";
    await requireAccessArea("alliances");
    await updateAllianceAction(id, values);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("editAlliance")}
        </h1>
        <Link
          href={`/alliances/${id}`}
          className="text-sm text-muted-foreground underline"
        >
          &larr; {result.alliance.organizationName}
        </Link>
      </div>

      <AllianceForm
        alliance={result.alliance}
        clients={clients}
        companies={companies}
        onSubmit={submit}
      />
    </div>
  );
}

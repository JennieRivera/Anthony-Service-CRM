import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAssociationChamberById } from "@/lib/queries/associationsChambers";
import { listClientsForSelect } from "@/lib/queries/clients";
import { listCompaniesForSelect } from "@/lib/queries/companies";
import { Link } from "@/i18n/navigation";
import { AssociationChamberForm } from "@/components/associations/AssociationChamberForm";
import { updateAssociationChamberAction } from "../../actions";
import type { AssociationChamberFormValues } from "@/lib/validation/associationChamber";
import { requireAccessArea } from "@/lib/permissions";

export default async function EditAssociationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Associations");

  const [org, clients, companies] = await Promise.all([
    getAssociationChamberById(id),
    listClientsForSelect(),
    listCompaniesForSelect(),
  ]);
  if (!org) notFound();

  async function submit(values: AssociationChamberFormValues) {
    "use server";
    await requireAccessArea("associations");
    await updateAssociationChamberAction(id, values);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("editOrganization")}
        </h1>
        <Link
          href={`/associations/${id}`}
          className="text-sm text-muted-foreground underline"
        >
          &larr; {org.organizationName}
        </Link>
      </div>

      <AssociationChamberForm
        organization={org}
        clients={clients}
        companies={companies}
        onSubmit={submit}
      />
    </div>
  );
}

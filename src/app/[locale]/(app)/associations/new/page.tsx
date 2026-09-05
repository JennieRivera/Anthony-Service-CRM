import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AssociationChamberForm } from "@/components/associations/AssociationChamberForm";
import { createAssociationChamberAction } from "../actions";

export default async function NewAssociationPage() {
  const t = await getTranslations("Associations");

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("newOrganization")}
        </h1>
        <Link
          href="/associations"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToAssociations")}
        </Link>
      </div>

      <AssociationChamberForm onSubmit={createAssociationChamberAction} />
    </div>
  );
}

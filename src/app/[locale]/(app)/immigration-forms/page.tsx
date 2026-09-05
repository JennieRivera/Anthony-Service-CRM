import { getTranslations } from "next-intl/server";
import { listImmigrationForms } from "@/lib/queries/immigrationForms";
import { ImmigrationFormsManager } from "@/components/immigration/ImmigrationFormsManager";

export default async function ImmigrationFormsPage() {
  const t = await getTranslations("ImmigrationForms");
  const forms = await listImmigrationForms();

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("instructions")}</p>
      </div>

      <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        {t("disclaimer")}
      </p>

      <ImmigrationFormsManager forms={forms} />
    </div>
  );
}

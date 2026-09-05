import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listProfessionalSystems } from "@/lib/queries/professionalSystems";
import { ProfessionalSystemsManager } from "@/components/settings/ProfessionalSystemsManager";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function ProfessionalSystemsSettingsPage() {
  const t = await getTranslations("ProfessionalSystems");
  const configured = isDatabaseConfigured();
  const systems = configured ? await listProfessionalSystems() : [];

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <Link href="/settings" className="text-sm text-muted-foreground underline">
          &larr; {t("backToSettings")}
        </Link>
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("manageDescription")}</p>
      </div>

      {!configured && <DatabaseNotConfigured />}
      {configured && <ProfessionalSystemsManager systems={systems} />}
    </div>
  );
}

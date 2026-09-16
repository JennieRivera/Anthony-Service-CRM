import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listNotaryStateGuide } from "@/lib/queries/notaryStateGuide";
import { NotaryStateGuideSettingsManager } from "@/components/settings/NotaryStateGuideSettingsManager";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function NotaryStateGuideSettingsPage() {
  const t = await getTranslations("NotaryStateGuideSettings");
  const configured = isDatabaseConfigured();
  const rows = configured ? await listNotaryStateGuide() : [];

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <Link href="/settings" className="text-sm text-muted-foreground underline">
          &larr; {t("backToSettings")}
        </Link>
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {!configured && <DatabaseNotConfigured />}
      {configured && <NotaryStateGuideSettingsManager rows={rows} />}
    </div>
  );
}

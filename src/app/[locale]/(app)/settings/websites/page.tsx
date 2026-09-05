import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listWebsiteLinks } from "@/lib/queries/websiteLinks";
import { WebsiteLinksManager } from "@/components/settings/WebsiteLinksManager";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function WebsitesSettingsPage() {
  const t = await getTranslations("MyWebsites");
  const configured = isDatabaseConfigured();
  const websites = configured ? await listWebsiteLinks() : [];

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <Link href="/settings" className="text-sm text-muted-foreground underline">
          &larr; {t("backToSettings")}
        </Link>
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("manageDescription")}</p>
      </div>

      {!configured && <DatabaseNotConfigured />}
      {configured && <WebsiteLinksManager websites={websites} />}
    </div>
  );
}

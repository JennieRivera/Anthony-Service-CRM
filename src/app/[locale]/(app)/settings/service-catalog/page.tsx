import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listServiceCatalogItems } from "@/lib/queries/serviceCatalog";
import { ServiceCatalogManager } from "@/components/settings/ServiceCatalogManager";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function ServiceCatalogSettingsPage() {
  const t = await getTranslations("ServiceCatalog");
  const configured = isDatabaseConfigured();
  const items = configured ? await listServiceCatalogItems() : [];

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
      {configured && <ServiceCatalogManager items={items} />}
    </div>
  );
}

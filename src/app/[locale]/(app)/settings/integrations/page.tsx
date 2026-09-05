import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listIntegrationSettings } from "@/lib/queries/integrationSettings";
import { IntegrationCard } from "@/components/settings/IntegrationCard";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

const CATEGORY_ORDER = [
  "communications",
  "productivity",
  "professional_systems",
] as const;

export default async function IntegrationsSettingsPage() {
  const t = await getTranslations("Integrations");
  const configured = isDatabaseConfigured();

  const integrations = configured ? await listIntegrationSettings() : [];

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <Link
          href="/settings"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToSettings")}
        </Link>
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {!configured && <DatabaseNotConfigured />}

      {configured &&
        CATEGORY_ORDER.map((category) => {
          const items = integrations.filter((i) => i.category === category);
          if (items.length === 0) return null;
          return (
            <div key={category} className="flex flex-col gap-3">
              <h2 className="font-heading text-lg text-foreground">
                {t(`categories.${category}`)}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((integration) => (
                  <IntegrationCard key={integration.key} integration={integration} />
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}

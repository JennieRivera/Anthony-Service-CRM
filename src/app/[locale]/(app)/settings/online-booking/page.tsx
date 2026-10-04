import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getCurrentRole, hasAccessArea } from "@/lib/permissions";
import { getOnlineBookingConfig } from "@/lib/queries/onlineBooking";
import { OnlineBookingSettingsManager } from "@/components/settings/OnlineBookingSettingsManager";
import AccessDenied from "@/components/AccessDenied";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function OnlineBookingSettingsPage() {
  const t = await getTranslations("OnlineBooking");
  const locale = await getLocale();

  const role = await getCurrentRole();
  if (!role || !hasAccessArea(role, "settings")) {
    return (
      <div className="flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <AccessDenied />
      </div>
    );
  }

  const configured = isDatabaseConfigured();
  const config = configured ? await getOnlineBookingConfig() : null;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <Link href="/settings" className="text-sm text-muted-foreground underline">
          &larr; {t("backToSettings")}
        </Link>
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <span className="text-sm text-muted-foreground">{t("publicLink")}:</span>
        <code className="text-sm text-foreground">/{locale}/book</code>
        <Button
          variant="outline"
          size="sm"
          render={<a href={`/${locale}/book`} target="_blank" rel="noopener noreferrer" />}
        >
          <ExternalLink className="h-4 w-4" />
          {t("openPage")}
        </Button>
      </div>

      {!configured && <DatabaseNotConfigured />}
      {config && <OnlineBookingSettingsManager config={config} />}
    </div>
  );
}

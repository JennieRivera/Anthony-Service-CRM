import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getDb } from "@/lib/db";
import { getCurrentRole, hasAccessArea } from "@/lib/permissions";
import { DEFAULT_LEGAL_TEXTS, getLegalTexts } from "@/lib/legal/texts";
import type { PortalDb } from "@/lib/portal/db";
import { LegalTextsManager } from "@/components/settings/LegalTextsManager";
import AccessDenied from "@/components/AccessDenied";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function LegalTextsSettingsPage() {
  const t = await getTranslations("LegalTexts");

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
  const texts = configured ? await getLegalTexts(getDb() as unknown as PortalDb) : null;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <Link href="/settings" className="text-sm text-muted-foreground underline">
          &larr; {t("backToSettings")}
        </Link>
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-foreground" role="note">
        {t("attorneyReviewWarning")}
      </p>

      {!configured && <DatabaseNotConfigured />}
      {texts && <LegalTextsManager texts={texts} defaults={DEFAULT_LEGAL_TEXTS} />}
    </div>
  );
}

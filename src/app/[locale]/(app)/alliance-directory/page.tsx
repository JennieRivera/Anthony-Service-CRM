import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listAllianceDirectory } from "@/lib/queries/allianceDirectory";
import { dataAccess } from "@/lib/export/access";
import { AllianceDirectory } from "@/components/alliances/AllianceDirectory";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import AccessDenied from "@/components/AccessDenied";
import { getCurrentRole, hasAccessArea, hasAllianceViewAccess } from "@/lib/permissions";

// Every ally — the ones AMS added and the ones its allies added in their
// portals — in one place. Staff only: allies never see this directory.
export default async function AllianceDirectoryPage() {
  const t = await getTranslations("AllianceDirectory");
  const role = await getCurrentRole();
  if (!role || !hasAllianceViewAccess(role)) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <AccessDenied />
      </div>
    );
  }
  if (!isDatabaseConfigured()) return <DatabaseNotConfigured />;

  const [rows, { canExport }] = await Promise.all([listAllianceDirectory(), dataAccess()]);
  return (
    <div className="flex w-full min-w-0 flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <AllianceDirectory rows={rows} canExport={canExport} canEdit={hasAccessArea(role, "alliances")} />
    </div>
  );
}

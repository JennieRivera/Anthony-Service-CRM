import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePartnerPage } from "@/lib/partners/page";
import { getDirectoryStatus, listNetworkDirectory } from "@/lib/partners/directory";
import { activeServiceTypeValues } from "@/lib/validation/client";
import { PartnerDirectory } from "@/components/partners/PartnerDirectory";

// "Network directory" — only for allies AMS authorized. Shows only business
// name, type, services, city and logo of the allies listed in it.
export default async function PartnerDirectoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePartnerPage(locale);
  if (!ctx) return null;

  const t = await getTranslations("Partners.directory");
  const status = await getDirectoryStatus(ctx.db, ctx.allianceId);
  if (!status.access) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="rounded-xl border border-border bg-card p-6 text-muted-foreground">{t("notAvailable")}</p>
      </div>
    );
  }
  const entries = await listNetworkDirectory(ctx.db, ctx.allianceId);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <PartnerDirectory entries={entries} services={activeServiceTypeValues} />
    </div>
  );
}

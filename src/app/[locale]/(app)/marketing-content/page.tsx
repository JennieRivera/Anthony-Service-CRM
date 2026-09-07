import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { isBlobConfigured } from "@/lib/blob/config";
import { listMarketingContentAssets } from "@/lib/queries/marketingContent";
import { MarketingContentLibrary } from "@/components/marketing-content/MarketingContentLibrary";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function MarketingContentPage() {
  const t = await getTranslations("MarketingContent");
  const configured = isDatabaseConfigured();
  const blobConfigured = isBlobConfigured();

  let assets: Awaited<ReturnType<typeof listMarketingContentAssets>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      assets = await listMarketingContentAssets();
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div>
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load marketing content: {error}.
        </p>
      )}

      {configured && !error && !blobConfigured && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {t("notConfigured")}
        </p>
      )}

      {configured && !error && (
        <MarketingContentLibrary assets={assets} blobConfigured={blobConfigured} />
      )}
    </div>
  );
}

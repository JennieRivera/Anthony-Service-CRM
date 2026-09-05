import { getTranslations } from "next-intl/server";
import { getSalesTaxMapData } from "@/lib/queries/salesTaxMap";
import { SalesTaxMap } from "@/components/sales-tax/SalesTaxMap";
import { upsertSalesTaxStateInfoAction } from "./actions";

export default async function SalesTaxMapPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const t = await getTranslations("SalesTaxMap");
  const data = await getSalesTaxMapData();
  const { state } = await searchParams;

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("instructions")}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <SalesTaxMap
          data={data}
          onSave={upsertSalesTaxStateInfoAction}
          initialState={state}
        />
      </div>
    </div>
  );
}

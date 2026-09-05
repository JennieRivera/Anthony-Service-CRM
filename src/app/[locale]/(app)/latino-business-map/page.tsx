import { getTranslations } from "next-intl/server";
import { getLatinoBusinessMapData } from "@/lib/queries/latinoBusinessMap";
import { LatinoBusinessMap } from "@/components/latino-business/LatinoBusinessMap";
import { upsertLatinoBusinessDataAction } from "./actions";

export default async function LatinoBusinessMapPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const t = await getTranslations("LatinoBusinessMap");
  const data = await getLatinoBusinessMapData();
  const { state } = await searchParams;

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("instructions")}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <LatinoBusinessMap
          data={data}
          onSave={upsertLatinoBusinessDataAction}
          initialState={state}
        />
      </div>
    </div>
  );
}

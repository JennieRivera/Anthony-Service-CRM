import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AllianceForm } from "@/components/alliances/AllianceForm";
import { createAllianceAction } from "../actions";

export default async function NewAlliancePage() {
  const t = await getTranslations("Alliances");

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("newAlliance")}
        </h1>
        <Link
          href="/alliances"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToAlliances")}
        </Link>
      </div>

      <AllianceForm onSubmit={createAllianceAction} />
    </div>
  );
}

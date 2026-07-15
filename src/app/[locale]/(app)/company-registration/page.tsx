import { getTranslations } from "next-intl/server";
import { StateRegistrationMap } from "@/components/company-registration/StateRegistrationMap";

export default async function CompanyRegistrationPage() {
  const t = await getTranslations("CompanyRegistration");

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("instructions")}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <StateRegistrationMap />
      </div>
    </div>
  );
}

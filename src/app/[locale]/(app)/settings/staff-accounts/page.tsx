import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listStaffAccounts } from "@/lib/queries/staffAccounts";
import { StaffAccountsManager } from "@/components/settings/StaffAccountsManager";

export default async function StaffAccountsPage() {
  const t = await getTranslations("StaffAccounts");
  const accounts = await listStaffAccounts();

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <Link href="/settings" className="text-sm text-muted-foreground underline">
          &larr; {t("backToSettings")}
        </Link>
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("instructions")}</p>
      </div>

      <StaffAccountsManager accounts={accounts} />
    </div>
  );
}

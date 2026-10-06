import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ReferralForm } from "@/components/referrals/ReferralForm";
import { listClientsForSelect } from "@/lib/queries/cases";
import { listCasesForSelect } from "@/lib/queries/referrals";
import { listAlliancesForSelect } from "@/lib/queries/alliances";
import { createReferralAction } from "../actions";
import AccessDenied from "@/components/AccessDenied";
import { getCurrentRole, hasAccessArea } from "@/lib/permissions";

export default async function NewReferralPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; caseId?: string; allianceId?: string; category?: string }>;
}) {
  const t = await getTranslations("Referrals");

  const role = await getCurrentRole();
  if (!role || !hasAccessArea(role, "referrals")) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("newReferral")}</h1>
        <AccessDenied />
      </div>
    );
  }

  const { clientId, caseId, allianceId, category } = await searchParams;
  const [clients, cases, alliances] = await Promise.all([
    listClientsForSelect(),
    listCasesForSelect(),
    listAlliancesForSelect(),
  ]);

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("newReferral")}
        </h1>
        <Link
          href="/referrals"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToReferrals")}
        </Link>
      </div>

      <ReferralForm
        clients={clients}
        cases={cases}
        alliances={alliances}
        defaultClientId={clientId}
        defaultCaseId={cases.some((c) => c.id === caseId) ? caseId : undefined}
        defaultAllianceId={alliances.some((a) => a.id === allianceId) ? allianceId : undefined}
        defaultCategory={category === "commercial_finance" ? "commercial_finance" : undefined}
        onSubmit={createReferralAction}
      />
    </div>
  );
}

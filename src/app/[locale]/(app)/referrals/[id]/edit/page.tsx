import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ReferralForm } from "@/components/referrals/ReferralForm";
import { listClientsForSelect } from "@/lib/queries/cases";
import { listCasesForSelect, getReferralById } from "@/lib/queries/referrals";
import { listAlliancesForSelect } from "@/lib/queries/alliances";
import { updateReferralAction } from "../../actions";
import type { ReferralFormValues } from "@/lib/validation/referral";
import AccessDenied from "@/components/AccessDenied";
import { getCurrentRole, hasAccessArea, requireAccessArea } from "@/lib/permissions";

export default async function EditReferralPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Referrals");

  const role = await getCurrentRole();
  if (!role || !hasAccessArea(role, "referrals")) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("editReferral")}</h1>
        <AccessDenied />
      </div>
    );
  }

  const result = await getReferralById(id);
  if (!result) notFound();

  const [clients, cases, alliances] = await Promise.all([
    listClientsForSelect(),
    listCasesForSelect(),
    listAlliancesForSelect(),
  ]);

  async function submit(values: ReferralFormValues) {
    "use server";
    await requireAccessArea("referrals");
    await updateReferralAction(id, values);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("editReferral")}
        </h1>
        <Link
          href={`/referrals/${id}`}
          className="text-sm text-muted-foreground underline"
        >
          &larr; REF-{String(result.referral.referralSeq).padStart(5, "0")}
        </Link>
      </div>

      <ReferralForm
        referral={result.referral}
        rriDetails={result.rriDetails}
        clients={clients}
        cases={cases}
        alliances={alliances}
        onSubmit={submit}
      />
    </div>
  );
}

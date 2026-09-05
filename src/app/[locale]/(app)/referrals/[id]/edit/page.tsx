import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDb } from "@/lib/db";
import { referrals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { ReferralForm } from "@/components/referrals/ReferralForm";
import { listClientsForSelect } from "@/lib/queries/cases";
import { listCasesForSelect } from "@/lib/queries/referrals";
import { updateReferralAction } from "../../actions";
import type { ReferralFormValues } from "@/lib/validation/referral";

export default async function EditReferralPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Referrals");

  const [referral] = await getDb()
    .select()
    .from(referrals)
    .where(eq(referrals.id, id))
    .limit(1);

  if (!referral) notFound();

  const [clients, cases] = await Promise.all([
    listClientsForSelect(),
    listCasesForSelect(),
  ]);

  async function submit(values: ReferralFormValues) {
    "use server";
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
          &larr; REF-{String(referral.referralSeq).padStart(5, "0")}
        </Link>
      </div>

      <ReferralForm
        referral={referral}
        clients={clients}
        cases={cases}
        onSubmit={submit}
      />
    </div>
  );
}

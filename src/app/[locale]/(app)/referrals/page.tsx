import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listReferralsWithClient } from "@/lib/queries/referrals";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ReferralTable } from "@/components/referrals/ReferralTable";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function ReferralsPage() {
  const t = await getTranslations("Referrals");
  const configured = isDatabaseConfigured();

  let referrals: Awaited<ReturnType<typeof listReferralsWithClient>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      referrals = await listReferralsWithClient();
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("title")}
        </h1>
        <Button render={<Link href="/referrals/new" />}>
          <Plus className="h-4 w-4" />
          {t("newReferral")}
        </Button>
      </div>

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load referrals: {error}.
        </p>
      )}

      {configured && !error && (
        <>
          {referrals.length === 0 ? (
            <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <ReferralTable referrals={referrals} />
          )}
        </>
      )}
    </div>
  );
}

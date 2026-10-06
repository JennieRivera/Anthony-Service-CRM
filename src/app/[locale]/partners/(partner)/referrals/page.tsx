import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePartnerPage } from "@/lib/partners/page";
import { listPartnerReferrals } from "@/lib/partners/queries";
import { activeServiceTypeValues } from "@/lib/validation/client";
import { PartnerReferrals } from "@/components/partners/PartnerReferrals";

// Referrals AMS sent to this alliance (only what it needs, and the client's
// name/phone only with the client's permission), and referrals it sends AMS.
export default async function PartnerReferralsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePartnerPage(locale);
  if (!ctx) return null;

  const { toPartner, fromPartner } = await listPartnerReferrals(ctx.db, ctx.allianceId);
  const t = await getTranslations("Partners.referrals");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <PartnerReferrals toPartner={toPartner} fromPartner={fromPartner} services={activeServiceTypeValues} />
    </div>
  );
}

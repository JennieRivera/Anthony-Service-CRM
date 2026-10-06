import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePartnerPage } from "@/lib/partners/page";
import { listPartnerContacts } from "@/lib/partners/network";
import { activeServiceTypeValues } from "@/lib/validation/client";
import { PartnerNetwork } from "@/components/partners/PartnerNetwork";

// "My allies and contacts": only this ally's own network.
export default async function PartnerNetworkPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePartnerPage(locale);
  if (!ctx) return null;

  const contacts = await listPartnerContacts(ctx.db, ctx.allianceId);
  const t = await getTranslations("Partners.network");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <PartnerNetwork
        contacts={contacts.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
        services={activeServiceTypeValues}
      />
    </div>
  );
}

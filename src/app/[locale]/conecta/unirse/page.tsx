import { getTranslations, setRequestLocale } from "next-intl/server";
import { businessInfo } from "@/lib/business-info";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/db/config";
import { DEFAULT_LEGAL_TEXTS, getLegalTexts, pickLocale } from "@/lib/legal/texts";
import type { PortalDb } from "@/lib/portal/db";
import { PartnerHeader } from "@/components/partners/PartnerHeader";
import { ConectaJoinForm } from "@/components/partners/ConectaJoinForm";
import { LegalFooter } from "@/components/portal/LegalFooter";

// "Join Diamante Conecta 360" — public. The application reaches the CRM
// only after the email is confirmed with a code, and gets no access until
// AMS approves it.
export default async function ConectaJoinPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const texts = isDatabaseConfigured() ? await getLegalTexts(getDb() as unknown as PortalDb) : DEFAULT_LEGAL_TEXTS;
  const t = await getTranslations("Conecta.join");
  const tPartners = await getTranslations("Partners");

  return (
    <>
      <PartnerHeader signedIn={false} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl text-foreground sm:text-3xl">{t("title")}</h1>
          <p className="text-muted-foreground">{t("intro")}</p>
        </div>
        <ConectaJoinForm
          terms={pickLocale(texts.partner_terms, locale)}
          notice={pickLocale(texts.not_a_law_firm, locale)}
          noticeLabel={pickLocale(texts.not_a_law_firm_ack, locale)}
        />
      </main>
      <LegalFooter
        notALawFirm={pickLocale(texts.not_a_law_firm, locale)}
        floridaNotaryDisclosure={texts.florida_notary_disclosure}
        questionsLabel={tPartners("questions", { phone: businessInfo.phone })}
      />
    </>
  );
}

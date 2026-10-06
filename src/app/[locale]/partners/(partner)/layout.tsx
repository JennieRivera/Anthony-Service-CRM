import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { businessInfo } from "@/lib/business-info";
import { getLegalTexts, pickLocale } from "@/lib/legal/texts";
import { getPartnerAlliance, getPartnerLogoUrl } from "@/lib/partners/queries";
import { hasPartnerAccepted } from "@/lib/partners/page";
import { getPartnerSession, partnerDb } from "@/lib/partners/session";
import { PartnerHeader } from "@/components/partners/PartnerHeader";
import { PartnerTermsGate } from "@/components/partners/PartnerTermsGate";
import { LegalFooter } from "@/components/portal/LegalFooter";

// Every signed-in partner page. No session → the access page. The first
// time, the alliance accepts the alliance terms and "not a law firm"
// before seeing anything else.
export default async function PartnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getPartnerSession();
  if (!session) redirect({ href: "/partners/access", locale });
  const { allianceId } = session!;

  const db = partnerDb();
  const [alliance, logo, texts, accepted] = await Promise.all([
    getPartnerAlliance(db, allianceId),
    getPartnerLogoUrl(db, allianceId),
    getLegalTexts(db),
    hasPartnerAccepted(db, allianceId),
  ]);
  if (!alliance) redirect({ href: "/partners/access", locale });

  const t = await getTranslations("Partners");
  return (
    <>
      <PartnerHeader signedIn businessName={alliance!.organizationName} hasLogo={Boolean(logo)} />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6">
        {accepted ? (
          children
        ) : (
          <PartnerTermsGate
            terms={pickLocale(texts.partner_terms, locale)}
            notice={pickLocale(texts.not_a_law_firm, locale)}
            noticeLabel={pickLocale(texts.not_a_law_firm_ack, locale)}
          />
        )}
      </main>
      <LegalFooter
        notALawFirm={pickLocale(texts.not_a_law_firm, locale)}
        floridaNotaryDisclosure={texts.florida_notary_disclosure}
        questionsLabel={t("questions", { phone: businessInfo.phone })}
      />
    </>
  );
}

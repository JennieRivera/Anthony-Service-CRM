import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { businessInfo } from "@/lib/business-info";
import { getLegalTexts, hasGrantedConsent, pickLocale } from "@/lib/legal/texts";
import { getPortalClient } from "@/lib/portal/queries";
import { getPortalSession, portalDb } from "@/lib/portal/session";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { LegalFooter } from "@/components/portal/LegalFooter";
import { NotALawFirmGate } from "@/components/portal/NotALawFirmGate";

// Every signed-in portal page. No portal session → the access page. The
// first time a client signs in they must tick the mandatory "not a law
// firm" acknowledgment before seeing anything else.
export default async function PortalClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getPortalSession();
  if (!session) redirect({ href: "/portal/access", locale });
  const { clientId } = session!;

  const db = portalDb();
  const [client, texts, acknowledged] = await Promise.all([
    getPortalClient(db, clientId),
    getLegalTexts(db),
    hasGrantedConsent(db, clientId, "not_a_law_firm"),
  ]);
  if (!client) redirect({ href: "/portal/access", locale });

  const t = await getTranslations("Portal");
  const firstName = client!.fullName.trim().split(/\s+/)[0];

  return (
    <>
      <PortalHeader signedIn firstName={firstName} hasPhoto={client!.hasPhoto} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        {acknowledged ? (
          children
        ) : (
          <NotALawFirmGate
            notice={pickLocale(texts.not_a_law_firm, locale)}
            checkboxLabel={pickLocale(texts.not_a_law_firm_ack, locale)}
          />
        )}
      </main>
      <LegalFooter
        notALawFirm={pickLocale(texts.not_a_law_firm, locale)}
        floridaNotaryDisclosure={texts.florida_notary_disclosure}
        questionsLabel={t("questions", { phone: businessInfo.phone })}
        privacyLabel={t("privacyLink")}
      />
      {/* Room for the phone bottom navigation (PortalHeader), so it never
          covers the end of the footer. */}
      <div className="h-[calc(3.5rem+env(safe-area-inset-bottom))] sm:hidden" aria-hidden />
    </>
  );
}

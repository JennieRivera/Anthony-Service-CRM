import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarClock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import { businessInfo } from "@/lib/business-info";
import { getPublicBookingServices } from "@/lib/booking/server";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { LegalFooter } from "@/components/portal/LegalFooter";
import { getDb } from "@/lib/db";
import { DEFAULT_LEGAL_TEXTS, getLegalTexts, pickLocale } from "@/lib/legal/texts";
import { getPortalBookingPrefill } from "@/lib/portal/queries";
import { getPortalSession } from "@/lib/portal/session";
import type { PortalDb } from "@/lib/portal/db";

// PUBLIC page — no login (see isPublicPath in src/proxy.ts) and outside
// the (app) route group, so no AppShell, no navigation, no admin UI. The
// only data it ever receives is the list of bookable services; free times
// come from /api/public/booking/availability. Never import anything from
// the authenticated app (server actions, client/appointment queries) here.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Book" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ service?: string | string[] }>;
}) {
  const { locale } = await params;
  const { service } = await searchParams;
  setRequestLocale(locale);
  // Services and hours are admin-editable, so never prerender this page.
  await connection();

  const t = await getTranslations("Book");
  const { enabled, services } = isDatabaseConfigured()
    ? await getPublicBookingServices()
    : { enabled: false, services: [] };
  const otherLocale = locale === "es" ? "en" : "es";
  const db = isDatabaseConfigured() ? (getDb() as unknown as PortalDb) : null;
  const legalTexts = db ? await getLegalTexts(db) : DEFAULT_LEGAL_TEXTS;
  const legal = {
    notALawFirm: pickLocale(legalTexts.not_a_law_firm, locale),
    acknowledgment: pickLocale(legalTexts.not_a_law_firm_ack, locale),
    // Florida §117.05(10): always English AND Spanish together.
    floridaNotaryDisclosure: legalTexts.florida_notary_disclosure,
  };
  // A signed-in client-portal visitor gets their own name/phone/email
  // prefilled — read from their portal session here, never from the URL.
  const portalSession = db ? await getPortalSession() : null;
  const prefill = db && portalSession ? await getPortalBookingPrefill(db, portalSession.clientId) : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-secondary/40">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CalendarClock className="size-5" aria-hidden />
            </span>
            <span className="font-heading text-lg leading-tight text-foreground">
              {t("businessName")}
            </span>
          </div>
          <Link
            href="/book"
            locale={otherLocale}
            className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
          >
            {t("switchLanguage")}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl text-foreground sm:text-3xl">{t("title")}</h1>
          <p className="text-muted-foreground">{t("intro")}</p>
        </div>

        {enabled && services.length > 0 ? (
          <BookingFlow
            services={services}
            locale={locale === "es" ? "es" : "en"}
            legal={legal}
            prefill={prefill}
            initialService={typeof service === "string" ? service : null}
          />
        ) : (
          <p className="rounded-xl border border-border bg-card p-6 text-foreground">
            {t("closed", { phone: businessInfo.phone })}
          </p>
        )}
      </main>

      <LegalFooter
        notALawFirm={legal.notALawFirm}
        floridaNotaryDisclosure={legal.floridaNotaryDisclosure}
        questionsLabel={t("questions", { phone: businessInfo.phone })}
      />
    </div>
  );
}

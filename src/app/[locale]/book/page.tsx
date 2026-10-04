import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarClock, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import { businessInfo } from "@/lib/business-info";
import { getPublicBookingServices } from "@/lib/booking/server";
import { BookingFlow } from "@/components/booking/BookingFlow";

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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Services and hours are admin-editable, so never prerender this page.
  await connection();

  const t = await getTranslations("Book");
  const { enabled, services } = isDatabaseConfigured()
    ? await getPublicBookingServices()
    : { enabled: false, services: [] };
  const otherLocale = locale === "es" ? "en" : "es";

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
          <BookingFlow services={services} locale={locale === "es" ? "es" : "en"} />
        ) : (
          <p className="rounded-xl border border-border bg-card p-6 text-foreground">
            {t("closed", { phone: businessInfo.phone })}
          </p>
        )}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
          <Phone className="size-4" aria-hidden />
          <a href={`tel:${businessInfo.phone.replace(/\D/g, "")}`} className="underline">
            {t("questions", { phone: businessInfo.phone })}
          </a>
        </div>
      </footer>
    </div>
  );
}

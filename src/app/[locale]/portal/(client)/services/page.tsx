import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalPage } from "@/lib/portal/page";
import { PORTAL_SERVICE_TYPES, getPortalInterestedServices } from "@/lib/portal/account";
import { getPublicBookingServices } from "@/lib/booking/server";
import { getLegalTexts, pickLocale } from "@/lib/legal/texts";
import { PortalServicesForm } from "@/components/portal/PortalServicesForm";

export default async function PortalServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePortalPage(locale);
  if (!ctx) return null;

  const [interested, booking, legal] = await Promise.all([
    getPortalInterestedServices(ctx.db, ctx.clientId),
    getPublicBookingServices(),
    getLegalTexts(ctx.db),
  ]);
  const t = await getTranslations("Portal.services");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <PortalServicesForm
        services={[...PORTAL_SERVICE_TYPES]}
        interested={interested}
        bookable={booking.enabled ? booking.services.map((s) => s.serviceType) : []}
        financeNotice={pickLocale(legal.not_a_law_firm, locale)}
      />
    </div>
  );
}

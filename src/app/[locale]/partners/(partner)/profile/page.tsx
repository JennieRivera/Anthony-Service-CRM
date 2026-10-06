import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePartnerPage } from "@/lib/partners/page";
import { getPartnerProfile } from "@/lib/partners/queries";
import { PARTNER_MAX_PHOTOS, PARTNER_MAX_SERVICES } from "@/lib/partners/config";
import { listPartnerServices } from "@/lib/partners/services";
import { licenseModeFor } from "@/lib/partners/license";
import { PartnerProfileForm } from "@/components/partners/PartnerProfileForm";
import { PartnerGallery } from "@/components/partners/PartnerGallery";
import { PartnerUploadForm } from "@/components/partners/PartnerUploadForm";
import { PartnerServicesEditor } from "@/components/partners/PartnerServicesEditor";

export default async function PartnerProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePartnerPage(locale);
  if (!ctx) return null;

  const [profile, services] = await Promise.all([getPartnerProfile(ctx.db, ctx.allianceId), listPartnerServices(ctx.db, ctx.allianceId)]);
  if (!profile) return null;
  const t = await getTranslations("Partners.profile");
  const a = profile.alliance;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro", { name: a.organizationName })}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-foreground">{t("logoTitle")}</h2>
        {profile.hasLogo && (
          // The alliance's own private logo, streamed after the session check.
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/api/partners/logo" alt="" className="size-24 rounded-lg border border-border object-cover" />
        )}
        <PartnerUploadForm kind="logo" label={profile.hasLogo ? t("changeLogo") : t("addLogo")} />
      </section>

      <PartnerProfileForm
        licenseMode={licenseModeFor(a.organizationType)}
        initial={{
          contactPerson: a.contactPerson ?? "",
          phone: a.phone ?? "",
          email: a.email ?? "",
          website: a.website ?? "",
          city: a.city ?? "",
          state: a.state ?? "",
          description: profile.description,
          servicesOffered: profile.servicesOffered,
          serviceArea: profile.serviceArea,
          socialLinks: profile.socialLinks,
          licenseNumber: profile.licenseNumber,
          licenseExpiration: profile.licenseExpiration,
          insuranceProvider: profile.insuranceProvider,
          insuranceExpiration: profile.insuranceExpiration,
        }}
      />

      <PartnerServicesEditor services={services} max={PARTNER_MAX_SERVICES} />

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-foreground">{t("galleryTitle", { max: PARTNER_MAX_PHOTOS })}</h2>
        <PartnerGallery photos={profile.photos} />
        {profile.photos.length < PARTNER_MAX_PHOTOS && <PartnerUploadForm kind="photo" label={t("addPhoto")} />}
      </section>
    </div>
  );
}

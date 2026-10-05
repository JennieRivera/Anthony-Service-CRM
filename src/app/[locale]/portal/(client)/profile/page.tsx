import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalPage } from "@/lib/portal/page";
import { getPortalProfile } from "@/lib/portal/account";
import { PortalProfileForm } from "@/components/portal/PortalProfileForm";
import { PortalPhotoEditor } from "@/components/portal/PortalPhotoEditor";

export default async function PortalProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePortalPage(locale);
  if (!ctx) return null;

  const profile = await getPortalProfile(ctx.db, ctx.clientId);
  const t = await getTranslations("Portal.profile");
  if (!profile) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">{t("photo.title")}</h2>
        <PortalPhotoEditor hasPhoto={profile.hasPhoto} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">{t("contactTitle")}</h2>
        <PortalProfileForm
          fullName={profile.fullName}
          defaults={{
            phone: profile.phone,
            email: profile.email,
            address: profile.address,
            preferredLanguage: profile.preferredLanguage,
            bestTimeToCall: profile.bestTimeToCall,
          }}
        />
      </section>
    </div>
  );
}

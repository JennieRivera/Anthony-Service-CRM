import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getPartnerSession } from "@/lib/partners/session";
import { PortalAccessForm } from "@/components/portal/PortalAccessForm";
import { PartnerHeader } from "@/components/partners/PartnerHeader";
import { PartnerEmailLogin } from "@/components/partners/PartnerEmailLogin";
import { Link } from "@/i18n/navigation";

// Where a personal partner link lands: /{locale}/partners/access#<token>.
// Opening it does nothing by itself — the alliance confirms the last 4
// digits of its phone. An approved, active alliance can also sign in with
// its email (6-digit code); and a business can ask to join.
export default async function PartnerAccessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getPartnerSession()) redirect({ href: "/partners", locale });

  const t = await getTranslations("Partners");
  return (
    <>
      <PartnerHeader signedIn={false} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="font-heading text-2xl text-foreground">{t("access.title")}</h1>
        <PortalAccessForm endpoint="/api/partners/login" home="/partners" namespace="Partners.access" />
        <PartnerEmailLogin />
        <p className="pt-2 text-center text-sm text-muted-foreground">
          {t("access.wantToJoin")}{" "}
          <Link href="/conecta/unirse" className="font-medium text-primary underline">
            {t("access.join")}
          </Link>
        </p>
      </main>
    </>
  );
}

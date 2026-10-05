import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getPortalSession } from "@/lib/portal/session";
import { PortalAccessForm } from "@/components/portal/PortalAccessForm";
import { PortalHeader } from "@/components/portal/PortalHeader";

// Where a personal portal link lands: /{locale}/portal/access#<token>.
// Opening the link does nothing by itself (WhatsApp's link preview opens
// it too) — the client must confirm the last 4 digits of their phone.
export default async function PortalAccessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getPortalSession()) redirect({ href: "/portal", locale });

  const t = await getTranslations("Portal");
  return (
    <>
      <PortalHeader signedIn={false} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="font-heading text-2xl text-foreground">{t("access.title")}</h1>
        <PortalAccessForm />
      </main>
    </>
  );
}

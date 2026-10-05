import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalPage } from "@/lib/portal/page";
import { getPortalAuthorizations, PORTAL_AUTHORIZATIONS } from "@/lib/portal/account";
import { getPortalClient } from "@/lib/portal/queries";
import { getLegalTexts, pickLocale } from "@/lib/legal/texts";
import { PortalAuthorizationsForm } from "@/components/portal/PortalAuthorizationsForm";

export default async function PortalAuthorizationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePortalPage(locale);
  if (!ctx) return null;

  const [state, client, texts] = await Promise.all([
    getPortalAuthorizations(ctx.db, ctx.clientId),
    getPortalClient(ctx.db, ctx.clientId),
    getLegalTexts(ctx.db),
  ]);
  const t = await getTranslations("Portal.authorizations");

  const initial = Object.fromEntries(
    PORTAL_AUTHORIZATIONS.map((a) => [
      a,
      { granted: state[a].granted, at: state[a].at?.toISOString() ?? null, signatureName: state[a].signatureName ?? null },
    ]),
  ) as React.ComponentProps<typeof PortalAuthorizationsForm>["initial"];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <PortalAuthorizationsForm
        initial={initial}
        documentProcessingText={pickLocale(texts.document_processing_authorization, locale)}
        fullName={client?.fullName ?? ""}
      />
    </div>
  );
}

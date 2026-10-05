import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePortalPage } from "@/lib/portal/page";
import { getPortalCase, listPortalDocuments } from "@/lib/portal/queries";
import { CaseStatusPill } from "@/components/portal/PortalBadges";
import { PortalDocumentList } from "@/components/portal/PortalDocumentList";
import { PortalUploadForm } from "@/components/portal/PortalUploadForm";

// One of the signed-in client's cases. The id comes from the URL, but the
// lookup is always scoped to the session's client: another client's case
// (or a made-up id) is a plain 404.
export default async function PortalCasePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requirePortalPage(locale);
  if (!ctx) return null;

  const caseRecord = await getPortalCase(ctx.db, ctx.clientId, id);
  if (!caseRecord) notFound();
  const documents = await listPortalDocuments(ctx.db, ctx.clientId, { caseId: caseRecord.id });

  const t = await getTranslations("Portal");
  const tService = await getTranslations("PublicServiceType");

  return (
    <div className="flex flex-col gap-5">
      <Link href="/portal/cases" className="text-sm text-muted-foreground underline">
        &larr; {t("cases.back")}
      </Link>
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="font-heading text-xl text-foreground">{caseRecord.title}</h1>
          <CaseStatusPill status={caseRecord.status} />
        </div>
        <p className="text-sm text-muted-foreground">{tService(caseRecord.serviceType)}</p>
        {caseRecord.nextAction && (
          <div className="mt-2">
            <p className="text-sm font-medium text-foreground">{t("cases.nextAction")}</p>
            <p className="whitespace-pre-line text-sm text-foreground">{caseRecord.nextAction}</p>
          </div>
        )}
        {caseRecord.documentsRequested && (
          <div className="mt-2">
            <p className="text-sm font-medium text-foreground">{t("cases.documentsRequested")}</p>
            <p className="whitespace-pre-line text-sm text-foreground">{caseRecord.documentsRequested}</p>
          </div>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">{t("documents.title")}</h2>
        <PortalDocumentList documents={documents} locale={locale} />
      </section>

      <section id="upload" className="flex scroll-mt-4 flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">{t("upload.titleForCase")}</h2>
        <PortalUploadForm caseId={caseRecord.id} />
      </section>
    </div>
  );
}

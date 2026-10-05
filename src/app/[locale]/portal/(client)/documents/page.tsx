import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePortalPage } from "@/lib/portal/page";
import { listPortalCases, listPortalDocuments } from "@/lib/portal/queries";
import { isActiveCaseStatus } from "@/lib/portal/display";
import { PortalDocumentList } from "@/components/portal/PortalDocumentList";
import { PortalUploadForm } from "@/components/portal/PortalUploadForm";

export default async function PortalDocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePortalPage(locale);
  if (!ctx) return null;

  const [documents, cases] = await Promise.all([
    listPortalDocuments(ctx.db, ctx.clientId),
    listPortalCases(ctx.db, ctx.clientId),
  ]);
  const t = await getTranslations("Portal");

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-2xl text-foreground">{t("documents.title")}</h1>

      <section id="upload" className="flex scroll-mt-4 flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">{t("upload.title")}</h2>
        <PortalUploadForm
          cases={cases.filter((c) => isActiveCaseStatus(c.status)).map((c) => ({ id: c.id, title: c.title }))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">{t("documents.yours")}</h2>
        <PortalDocumentList documents={documents} locale={locale} />
      </section>
    </div>
  );
}

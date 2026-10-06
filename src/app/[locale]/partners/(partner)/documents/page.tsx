import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, FileText } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { requirePartnerPage } from "@/lib/partners/page";
import { PARTNER_DOCUMENT_TYPES, listPartnerDocuments } from "@/lib/partners/queries";
import { PartnerUploadForm } from "@/components/partners/PartnerUploadForm";

// Documents: what AMS shared with this alliance ("Visible to the partner")
// and what the alliance uploaded (contracts, W-9, license, insurance…).
export default async function PartnerDocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePartnerPage(locale);
  if (!ctx) return null;

  const documents = await listPartnerDocuments(ctx.db, ctx.allianceId);
  const t = await getTranslations("Partners.documents");
  const tType = await getTranslations("AllianceDocumentType");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <PartnerUploadForm kind="document" documentTypes={PARTNER_DOCUMENT_TYPES} label={t("upload")} />
      {documents.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <a href={`/api/partners/documents/${d.id}/file`} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 font-medium text-foreground hover:underline">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{d.fileName}</span>
              </a>
              <span className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {d.documentType && <span>{tType(d.documentType)}</span>}
                <span>{d.uploadedByPartner ? t("fromYou") : t("fromAms")}</span>
                <span>{formatDate(d.createdAt)}</span>
                <a href={`/api/partners/documents/${d.id}/file?download=1`} className="flex items-center gap-1 text-primary underline">
                  <Download className="size-4" aria-hidden />
                  {t("download")}
                </a>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

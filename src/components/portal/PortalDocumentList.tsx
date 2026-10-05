import { getTranslations } from "next-intl/server";
import { Download, FileText } from "lucide-react";
import { formatPortalShortDate } from "@/lib/portal/display";

type PortalDocumentRow = { id: string; fileName: string; createdAt: Date; uploadedByClient: boolean };

export async function PortalDocumentList({ documents, locale }: { documents: PortalDocumentRow[]; locale: string }) {
  const t = await getTranslations("Portal.documents");
  if (documents.length === 0) {
    return <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{t("empty")}</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between gap-3 p-4">
          <a
            href={`/api/portal/documents/${doc.id}/file`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-center gap-2 text-foreground hover:underline"
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{doc.fileName}</span>
              <span className="text-xs text-muted-foreground">
                {formatPortalShortDate(doc.createdAt, locale)} · {doc.uploadedByClient ? t("fromYou") : t("fromUs")}
              </span>
            </span>
          </a>
          <a
            href={`/api/portal/documents/${doc.id}/file?download=1`}
            className="flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
          >
            <Download className="size-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">{t("download")}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

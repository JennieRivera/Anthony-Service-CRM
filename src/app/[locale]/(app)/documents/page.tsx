import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listAllDocuments } from "@/lib/queries/documents";
import { Link } from "@/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentStatusPill } from "@/components/documents/StatusPill";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function DocumentsPage() {
  const t = await getTranslations("Documents");
  const configured = isDatabaseConfigured();

  let rows: Awaited<ReturnType<typeof listAllDocuments>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      rows = await listAllDocuments();
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load documents: {error}.
        </p>
      )}

      {configured && !error && rows.length === 0 && (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {t("empty")}
        </p>
      )}

      {configured && !error && rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnFile")}</TableHead>
                <TableHead>{t("columnClient")}</TableHead>
                <TableHead>{t("columnCase")}</TableHead>
                <TableHead>{t("columnType")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
                <TableHead>{t("columnUploaded")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <a
                      href={doc.blobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-medium text-foreground hover:underline"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {doc.fileName}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/clients/${doc.clientId}`}
                      className="text-muted-foreground hover:underline"
                    >
                      {doc.clientName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.caseTitle ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.documentType ?? "—"}
                  </TableCell>
                  <TableCell>
                    <DocumentStatusPill status={doc.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

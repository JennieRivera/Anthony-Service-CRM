"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Download, Folder } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentStatusPill } from "@/components/documents/StatusPill";
import { downloadHref } from "@/components/documents/downloadHref";
import { MoveCategorySelect } from "@/components/documents/MoveCategorySelect";
import { GeneralDocumentUploadDialog } from "@/components/documents/GeneralDocumentUploadDialog";
import { documentCategoryValues } from "@/lib/validation/documentCategory";
import type { listAllDocuments } from "@/lib/queries/documents";

type DocumentRow = Awaited<ReturnType<typeof listAllDocuments>>[number];

const UNCATEGORIZED = "uncategorized" as const;
type FolderKey = "all" | typeof UNCATEGORIZED | (typeof documentCategoryValues)[number];

export function DocumentsBrowser({
  documents,
  clients,
  cases,
  blobConfigured,
}: {
  documents: DocumentRow[];
  clients: { id: string; fullName: string }[];
  cases: { id: string; title: string; clientId: string }[];
  blobConfigured: boolean;
}) {
  const t = useTranslations("Documents");
  const tCategory = useTranslations("DocumentCategory");
  const [selected, setSelected] = useState<FolderKey>("all");

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const doc of documents) {
      const key = doc.category ?? UNCATEGORIZED;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [documents]);

  const uncategorizedCount = counts.get(UNCATEGORIZED) ?? 0;

  const visibleDocuments = useMemo(() => {
    if (selected === "all") return documents;
    if (selected === UNCATEGORIZED) return documents.filter((doc) => !doc.category);
    return documents.filter((doc) => doc.category === selected);
  }, [documents, selected]);

  if (documents.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {blobConfigured && (
          <div>
            <GeneralDocumentUploadDialog clients={clients} cases={cases} />
          </div>
        )}
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {t("empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full gap-6">
      <nav className="flex w-56 shrink-0 flex-col gap-1">
        <FolderButton
          label={t("allFolders")}
          count={documents.length}
          active={selected === "all"}
          onClick={() => setSelected("all")}
        />
        {documentCategoryValues.map((value) => (
          <FolderButton
            key={value}
            label={tCategory(value)}
            count={counts.get(value) ?? 0}
            active={selected === value}
            onClick={() => setSelected(value)}
          />
        ))}
        {uncategorizedCount > 0 && (
          <FolderButton
            label={t("uncategorized")}
            count={uncategorizedCount}
            active={selected === UNCATEGORIZED}
            onClick={() => setSelected(UNCATEGORIZED)}
          />
        )}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {blobConfigured && (
          <div>
            <GeneralDocumentUploadDialog
              clients={clients}
              cases={cases}
              initialCategory={selected === "all" || selected === UNCATEGORIZED ? undefined : selected}
            />
          </div>
        )}

        {visibleDocuments.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnFile")}</TableHead>
                  <TableHead>{t("columnClient")}</TableHead>
                  <TableHead>{t("columnCase")}</TableHead>
                  <TableHead>{t("columnType")}</TableHead>
                  <TableHead>{t("columnFolder")}</TableHead>
                  <TableHead>{t("columnStatus")}</TableHead>
                  <TableHead>{t("columnUploaded")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDocuments.map((doc) => (
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
                      {doc.folder ? (
                        <span className="text-muted-foreground">
                          {tCategory("immigration")}
                        </span>
                      ) : (
                        <MoveCategorySelect documentId={doc.id} category={doc.category} />
                      )}
                    </TableCell>
                    <TableCell>
                      <DocumentStatusPill status={doc.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <a href={downloadHref(doc.blobUrl)} download={doc.fileName} />
                        }
                      >
                        <Download className="h-4 w-4" />
                        {t("download")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function FolderButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-accent/50",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Folder className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span className={cn("text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {count}
      </span>
    </button>
  );
}

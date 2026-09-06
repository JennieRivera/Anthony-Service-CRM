"use client";

import { useTranslations } from "next-intl";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentStatusPill } from "./StatusPill";
import { downloadHref } from "./downloadHref";
import { MoveCategorySelect } from "./MoveCategorySelect";
import { immigrationDocumentFolderValues } from "@/lib/validation/immigrationDocumentFolder";
import type { Document } from "@/lib/db/schema";

function DocumentRow({ doc }: { doc: Document }) {
  const t = useTranslations("Documents");

  return (
    <li className="flex items-center justify-between gap-3 p-4">
      <a
        href={doc.blobUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 items-center gap-2 font-medium text-foreground hover:underline"
      >
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{doc.fileName}</span>
      </a>
      <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
        {doc.documentType && <span>{doc.documentType}</span>}
        <DocumentStatusPill status={doc.status} />
        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
        {/* A document with a fine immigration sub-folder stays tied to it —
            moving it to a general folder here would desync the two. */}
        {!doc.folder && <MoveCategorySelect documentId={doc.id} category={doc.category} />}
        <Button
          variant="outline"
          size="sm"
          render={<a href={downloadHref(doc.blobUrl)} download={doc.fileName} />}
        >
          <Download className="h-4 w-4" />
          {t("download")}
        </Button>
      </div>
    </li>
  );
}

export function DocumentList({
  documents,
  groupByFolder,
}: {
  documents: Document[];
  // Only meaningful for an Immigration Administrative Services case
  // (spec section 6) — groups documents under their 10 fixed folders.
  groupByFolder?: boolean;
}) {
  const t = useTranslations("Documents");
  const tFolder = useTranslations("ImmigrationDocumentFolder");

  if (documents.length === 0) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }

  if (!groupByFolder) {
    return (
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
        {documents.map((doc) => (
          <DocumentRow key={doc.id} doc={doc} />
        ))}
      </ul>
    );
  }

  const unfiled = documents.filter((doc) => !doc.folder);
  return (
    <div className="flex flex-col gap-4">
      {immigrationDocumentFolderValues.map((folder) => {
        const folderDocs = documents.filter((doc) => doc.folder === folder);
        if (folderDocs.length === 0) return null;
        return (
          <div key={folder} className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-foreground">
              {tFolder(folder)}
            </h4>
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
              {folderDocs.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </ul>
          </div>
        );
      })}
      {unfiled.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-foreground">
            {t("unfiled")}
          </h4>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {unfiled.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

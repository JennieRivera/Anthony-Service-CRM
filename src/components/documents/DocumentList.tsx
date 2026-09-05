"use client";

import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { DocumentStatusPill } from "./StatusPill";
import { immigrationDocumentFolderValues } from "@/lib/validation/immigrationDocumentFolder";
import type { Document } from "@/lib/db/schema";

function DocumentRow({ doc }: { doc: Document }) {
  return (
    <li className="flex items-center justify-between p-4">
      <a
        href={doc.blobUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 font-medium text-foreground hover:underline"
      >
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        {doc.fileName}
      </a>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {doc.documentType && <span>{doc.documentType}</span>}
        <DocumentStatusPill status={doc.status} />
        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
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

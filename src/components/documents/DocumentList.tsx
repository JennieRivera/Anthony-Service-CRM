"use client";

import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { DocumentStatusPill } from "./StatusPill";
import type { Document } from "@/lib/db/schema";

export function DocumentList({ documents }: { documents: Document[] }) {
  const t = useTranslations("Documents");

  if (documents.length === 0) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between p-4">
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
      ))}
    </ul>
  );
}

"use client";

import { formatDate } from "@/lib/dates";

import { useTranslations } from "next-intl";
import { FileText, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DocumentStatusPill } from "./StatusPill";
import { viewHref, downloadHref } from "./downloadHref";
import { MoveCategorySelect } from "./MoveCategorySelect";
import { MoveServiceFolderSelect } from "./MoveServiceFolderSelect";
import { documentFolder } from "@/lib/validation/documentDrawer";
import type { ServiceTypeValue } from "@/lib/validation/client";
import { ClientVisibilityToggle } from "./ClientVisibilityToggle";
import { Badge } from "@/components/ui/badge";
import { deleteDocumentAction } from "@/app/[locale]/(app)/documents/actions";
import { immigrationDocumentFolderValues } from "@/lib/validation/immigrationDocumentFolder";
import type { Document } from "@/lib/db/schema";

function DocumentRow({
  doc,
  caseServiceById,
}: {
  doc: Document;
  caseServiceById?: Record<string, ServiceTypeValue>;
}) {
  const t = useTranslations("Documents");

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <a
        href={viewHref(doc.id)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 items-center gap-2 font-medium text-foreground hover:underline"
      >
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{doc.fileName}</span>
      </a>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {doc.uploadedByClient && <Badge variant="secondary">{t("uploadedByClient")}</Badge>}
        {doc.sensitiveDataReason && (
          <Badge variant="destructive">{t("mayContainSensitiveData")}</Badge>
        )}
        {doc.documentType && <span>{doc.documentType}</span>}
        <DocumentStatusPill status={doc.status} />
        <ClientVisibilityToggle
          documentId={doc.id}
          visible={doc.visibleToClient}
          uploadedByClient={doc.uploadedByClient}
        />
        <span>{formatDate(doc.createdAt)}</span>
        {/* A document with a fine immigration sub-folder stays tied to it —
            moving it to a general folder here would desync the two. */}
        {!doc.folder && <MoveCategorySelect documentId={doc.id} category={doc.category} />}
        {caseServiceById && !doc.referralId && (
          <MoveServiceFolderSelect
            documentId={doc.id}
            current={documentFolder({
              ...doc,
              caseServiceType: doc.caseId ? (caseServiceById[doc.caseId] ?? null) : null,
            })}
            hasCase={Boolean(doc.caseId)}
          />
        )}
        <Button
          variant="outline"
          size="sm"
          render={<a href={downloadHref(doc.id)} />}
        >
          <Download className="h-4 w-4" />
          {t("download")}
        </Button>
        <ConfirmDialog
          trigger={
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4" />
              {t("delete")}
            </Button>
          }
          title={t("deleteConfirmTitle")}
          description={t("deleteConfirmDescription")}
          confirmLabel={t("delete")}
          confirmingLabel={t("deleting")}
          cancelLabel={t("deleteCancel")}
          onConfirm={() => deleteDocumentAction(doc.id)}
        />
      </div>
    </li>
  );
}

export function DocumentList({
  documents,
  groupByFolder,
  caseServiceById,
}: {
  documents: Document[];
  // Shows "Move to…" (Documents archive folder) on each row; maps the
  // client's case ids to their service.
  caseServiceById?: Record<string, ServiceTypeValue>;
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
          <DocumentRow key={doc.id} doc={doc} caseServiceById={caseServiceById} />
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

"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download, Eye, FileText, FolderInput, Image as ImageIcon, Megaphone, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ArchiveFolder, ArchiveItem } from "@/lib/partners/archive";
import { PartnerUploadForm } from "./PartnerUploadForm";
import { PartnerDocumentVisibility } from "@/components/alliances/PartnerDocumentVisibility";
import { AllianceDocumentTypeSelect } from "@/components/alliances/AllianceDocumentTypeSelect";
import { moveAllianceFileAction } from "@/app/[locale]/(app)/alliances/partner-actions";

const FOLDERS: { key: ArchiveFolder; icon: typeof FileText }[] = [
  { key: "documents", icon: FileText },
  { key: "photos", icon: ImageIcon },
  { key: "marketing", icon: Megaphone },
];
const isWebImage = (name: string) => /\.(jpe?g|png|webp)$/i.test(name);

// "My files" — the same three folders for the ally (its portal) and for
// staff (alliance record, Documents → Alliances). Thumbnails for images
// with a large view, search, a count per folder and "Move to…".
export function AllianceArchive({
  items,
  mode,
  allianceId,
  documentTypes,
}: {
  items: ArchiveItem[];
  mode: "partner" | "staff";
  // staff: the alliance the files belong to.
  allianceId?: string;
  // partner: document types offered when uploading to Documents.
  documentTypes?: readonly string[];
}) {
  const t = useTranslations("Archive");
  const tType = useTranslations("AllianceDocumentType");
  const router = useRouter();
  const [folder, setFolder] = useState<ArchiveFolder>("documents");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<ArchiveItem | null>(null);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(
    () => Object.fromEntries(FOLDERS.map((f) => [f.key, items.filter((i) => i.folder === f.key).length])) as Record<ArchiveFolder, number>,
    [items],
  );
  const q = query.trim().toLowerCase();
  const shown = items.filter((i) => i.folder === folder && (!q || i.fileName.toLowerCase().includes(q)));

  function move(item: ArchiveItem, to: "documents" | "photos") {
    startTransition(async () => {
      let error: string | undefined;
      if (mode === "staff" && allianceId) {
        const r = await moveAllianceFileAction(allianceId, item.id, to);
        if (!r.ok) error = r.error;
      } else {
        const res = await fetch(`/api/partners/documents/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: to }),
        }).catch(() => null);
        if (!res?.ok) error = ((await res?.json().catch(() => ({}))) as { error?: string } | undefined)?.error ?? "generic";
      }
      if (error) toast.error(t.has(`errors.${error}`) ? t(`errors.${error}`) : t("errors.generic"));
      else {
        toast.success(t("moved", { folder: t(`folders.${to}`) }));
        router.refresh();
      }
    });
  }

  const sourceLabel = (i: ArchiveItem) =>
    i.source === "logo"
      ? t("logo")
      : i.source === "gallery"
        ? t("gallery")
        : i.source === "marketing"
          ? t("sharedByAms")
          : i.fromPartner
            ? mode === "partner"
              ? t("fromYou")
              : t("fromPartner")
            : t("fromAms");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("title")}>
        {FOLDERS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={folder === key}
            onClick={() => setFolder(key)}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm",
              folder === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(`folders.${key}`)}
            <span className={cn("rounded-full px-2 text-xs", folder === key ? "bg-primary-foreground/20" : "bg-secondary")}>{counts[key]}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="h-11 pl-9" />
      </div>

      {mode === "partner" && folder !== "marketing" && (
        <PartnerUploadForm
          kind="document"
          folder={folder}
          documentTypes={folder === "documents" ? documentTypes : undefined}
          label={folder === "photos" ? t("uploadPhoto") : t("uploadDocument")}
        />
      )}
      {folder === "photos" && <p className="text-xs text-muted-foreground">{mode === "partner" ? t("galleryHint") : t("galleryHintStaff")}</p>}
      {folder === "marketing" && <p className="text-xs text-muted-foreground">{mode === "partner" ? t("marketingHint") : t("marketingHintStaff")}</p>}

      {shown.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">{q ? t("noMatches") : t("empty")}</p>
      ) : folder === "photos" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((i) => (
            <li key={i.key} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2">
              <button type="button" onClick={() => setPreview(i)} className="overflow-hidden rounded-lg" aria-label={t("viewLarge", { name: i.fileName })}>
                {/* eslint-disable-next-line @next/next/no-img-element -- private file streamed after the session check */}
                <img src={i.viewUrl} alt={i.fileName} loading="lazy" className="aspect-square w-full object-cover" />
              </button>
              <span className="truncate text-xs font-medium text-foreground" title={i.fileName}>
                {i.fileName}
              </span>
              <span className="text-xs text-muted-foreground">{sourceLabel(i)}</span>
              <ItemActions item={i} mode={mode} allianceId={allianceId} pending={pending} onMove={move} t={t} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
          {shown.map((i) => (
            <li key={i.key} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {i.isImage ? (
                  <button type="button" onClick={() => setPreview(i)} className="shrink-0 overflow-hidden rounded-md" aria-label={t("viewLarge", { name: i.fileName })}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- private file streamed after the session check */}
                    <img src={i.viewUrl} alt="" loading="lazy" className="size-12 object-cover" />
                  </button>
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary">
                    <FileText className="size-5 text-muted-foreground" aria-hidden />
                  </span>
                )}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-foreground" title={i.fileName}>
                    {i.fileName}
                  </span>
                  <span className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                    {i.documentType && <span>{tType(i.documentType)}</span>}
                    <span>{sourceLabel(i)}</span>
                    {i.createdAt && <span>{formatDate(i.createdAt)}</span>}
                    {mode === "staff" && i.sensitive && <Badge variant="destructive">{t("sensitive")}</Badge>}
                  </span>
                </div>
              </div>
              <ItemActions item={i} mode={mode} allianceId={allianceId} pending={pending} onMove={move} t={t} />
            </li>
          ))}
        </ul>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={preview.fileName} onClick={() => setPreview(null)}>
          <div className="relative flex max-h-full max-w-4xl flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <Button type="button" variant="secondary" size="icon" className="absolute -top-3 -right-3 rounded-full" onClick={() => setPreview(null)} aria-label={t("close")}>
              <X className="size-4" />
            </Button>
            {/* eslint-disable-next-line @next/next/no-img-element -- private file streamed after the session check */}
            <img src={preview.viewUrl} alt={preview.fileName} className="max-h-[80vh] w-auto rounded-lg object-contain" />
            <span className="text-center text-sm text-white">{preview.fileName}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemActions({
  item,
  mode,
  allianceId,
  pending,
  onMove,
  t,
}: {
  item: ArchiveItem;
  mode: "partner" | "staff";
  allianceId?: string;
  pending: boolean;
  onMove: (item: ArchiveItem, to: "documents" | "photos") => void;
  t: ReturnType<typeof useTranslations<"Archive">>;
}) {
  const other = item.folder === "documents" ? "photos" : "documents";
  const canMove = item.movable && item.source === "document" && (other === "documents" || isWebImage(item.fileName));
  return (
    <div className="flex flex-wrap items-center gap-2">
      {mode === "staff" && item.source === "document" && allianceId && (
        <>
          <PartnerDocumentVisibility documentId={item.id} visible={item.visibleToPartner} uploadedByPartner={item.fromPartner} />
          {item.folder === "documents" && <AllianceDocumentTypeSelect allianceId={allianceId} document={{ id: item.id, documentType: item.documentType as never }} />}
        </>
      )}
      <Button variant="outline" size="sm" className="h-9" render={<a href={item.viewUrl} target="_blank" rel="noopener noreferrer" />}>
        <Eye className="size-4" />
        {t("view")}
      </Button>
      <Button variant="outline" size="sm" className="h-9" render={<a href={item.downloadUrl} />}>
        <Download className="size-4" />
        {t("download")}
      </Button>
      {canMove && (
        <Button variant="ghost" size="sm" className="h-9" disabled={pending} onClick={() => onMove(item, other)}>
          <FolderInput className="size-4" />
          {t("moveTo", { folder: t(`folders.${other}`) })}
        </Button>
      )}
    </div>
  );
}

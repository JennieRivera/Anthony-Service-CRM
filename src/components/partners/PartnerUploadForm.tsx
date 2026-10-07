"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";
import { CheckCircle2, FileUp } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PORTAL_UPLOAD_ACCEPT } from "@/lib/portal/fileTypes";
import { PARTNER_MAX_UPLOAD_BYTES } from "@/lib/partners/config";

type Kind = "document" | "marketing" | "logo" | "photo" | "contact_document";
type Status = { kind: "idle" } | { kind: "uploading"; name: string; percent: number } | { kind: "done" } | { kind: "error"; message: string };

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";

// Partner upload: 1) /start signs a pathname for this alliance and this
// kind of file, 2) the file goes straight to private Blob storage (up to
// 10 MB), 3) /complete re-checks the real bytes and records it.
export function PartnerUploadForm({
  kind,
  documentTypes,
  withCaption = false,
  label,
  contactId,
  folder,
}: {
  kind: Kind;
  documentTypes?: readonly string[];
  withCaption?: boolean;
  label: string;
  // "contact_document": which of the ally's contacts the file is for.
  contactId?: string;
  // "document": the "My files" folder it goes to (photos = web images only).
  folder?: "documents" | "photos";
}) {
  const t = useTranslations("Partners.upload");
  const tDocType = useTranslations("AllianceDocumentType");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState(documentTypes?.[0] ?? "");
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const errorText = (code: string | undefined) =>
    ({
      unsupported_type: t("errors.type"),
      too_large: t("errors.size"),
      limit_reached: t("errors.limit"),
      photo_limit: t("errors.photoLimit"),
    })[code ?? ""] ?? t("errors.generic");

  async function handle(file: File | undefined) {
    if (!file) return;
    if (file.size > PARTNER_MAX_UPLOAD_BYTES) {
      setStatus({ kind: "error", message: t("errors.size") });
      return;
    }
    setStatus({ kind: "uploading", name: file.name, percent: 0 });
    try {
      const start = await fetch("/api/partners/uploads/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, kind, contactId, folder }),
      });
      const started = (await start.json().catch(() => ({}))) as { pathname?: string; contentType?: string; error?: string };
      if (!start.ok || !started.pathname) throw new Error(started.error);

      const blob = await upload(started.pathname, file, {
        access: "private",
        handleUploadUrl: "/api/partners/uploads/token",
        contentType: started.contentType,
        onUploadProgress: ({ percentage }) => setStatus({ kind: "uploading", name: file.name, percent: Math.round(percentage) }),
      });

      const done = await fetch("/api/partners/uploads/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname: blob.pathname, fileName: file.name, documentType, caption, contactId, folder }),
      });
      if (!done.ok) {
        const data = (await done.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error);
      }
      setStatus({ kind: "done" });
      setCaption("");
      router.refresh();
    } catch (err) {
      setStatus({ kind: "error", message: errorText(err instanceof Error ? err.message : undefined) });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  const busy = status.kind === "uploading";
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {documentTypes && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`doc-type-${kind}`}>{t("documentType")}</Label>
          <select
            id={`doc-type-${kind}`}
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground sm:w-72"
          >
            {documentTypes.map((d) => (
              <option key={d} value={d}>
                {tDocType(d)}
              </option>
            ))}
          </select>
        </div>
      )}
      {withCaption && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`caption-${kind}`}>{t("caption")}</Label>
          <Input id={`caption-${kind}`} value={caption} maxLength={500} onChange={(e) => setCaption(e.target.value)} />
        </div>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground disabled:opacity-60 sm:w-fit"
      >
        <FileUp className="size-5" aria-hidden />
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept={kind === "logo" || kind === "photo" || folder === "photos" ? IMAGE_ACCEPT : PORTAL_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      <p className="text-xs text-muted-foreground">{kind === "logo" || kind === "photo" || folder === "photos" ? t("imageRules") : t("rules")}</p>
      {status.kind === "uploading" && (
        <div className="flex flex-col gap-1" aria-live="polite">
          <p className="truncate text-sm text-foreground">{t("uploading", { name: status.name })}</p>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${status.percent}%` }} />
          </div>
        </div>
      )}
      {status.kind === "done" && (
        <p className="flex items-center gap-2 text-sm text-foreground" role="status">
          <CheckCircle2 className="size-4 text-primary" aria-hidden />
          {t("done")}
        </p>
      )}
      {status.kind === "error" && (
        <p className="text-sm text-destructive" role="alert">
          {status.message}
        </p>
      )}
    </div>
  );
}

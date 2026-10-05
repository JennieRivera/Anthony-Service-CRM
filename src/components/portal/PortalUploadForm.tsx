"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";
import { Camera, CheckCircle2, FileUp } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Label } from "@/components/ui/label";
import { PORTAL_MAX_UPLOAD_BYTES } from "@/lib/portal/config";
import { PORTAL_UPLOAD_ACCEPT, portalKindForFileName } from "@/lib/portal/fileTypes";

type Status = { kind: "idle" } | { kind: "uploading"; name: string; percent: number } | { kind: "done"; names: string[] } | { kind: "error"; message: string };

// Portal upload: 1) /start signs a pathname for this client, 2) the file
// goes straight from the phone to private Blob storage (up to 10 MB),
// 3) /complete re-checks the real bytes server-side and records it.
export function PortalUploadForm({
  caseId,
  cases,
}: {
  caseId?: string;
  cases?: { id: string; title: string }[];
}) {
  const t = useTranslations("Portal.upload");
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [selectedCase, setSelectedCase] = useState(caseId ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const errorMessage = (code: string | undefined) => {
    switch (code) {
      case "unsupported_type":
        return t("errors.type");
      case "too_large":
        return t("errors.size");
      case "limit_reached":
        return t("errors.limit");
      default:
        return t("errors.generic");
    }
  };

  async function uploadOne(file: File, targetCase: string | null): Promise<string | null> {
    if (file.size > PORTAL_MAX_UPLOAD_BYTES) return t("errors.size");
    if (!portalKindForFileName(file.name)) return t("errors.type");

    const start = await fetch("/api/portal/uploads/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, caseId: targetCase }),
    });
    const started = (await start.json().catch(() => ({}))) as { pathname?: string; contentType?: string; error?: string };
    if (!start.ok || !started.pathname) return errorMessage(started.error);

    const blob = await upload(started.pathname, file, {
      access: "private",
      handleUploadUrl: "/api/portal/uploads/token",
      contentType: started.contentType,
      onUploadProgress: ({ percentage }) =>
        setStatus({ kind: "uploading", name: file.name, percent: Math.round(percentage) }),
    });

    const done = await fetch("/api/portal/uploads/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathname: blob.pathname, fileName: file.name, caseId: targetCase }),
    });
    if (!done.ok) {
      const data = (await done.json().catch(() => ({}))) as { error?: string };
      return errorMessage(data.error);
    }
    return null;
  }

  async function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    const targetCase = caseId ?? (selectedCase || null);
    const uploaded: string[] = [];
    for (const file of files) {
      setStatus({ kind: "uploading", name: file.name, percent: 0 });
      try {
        const error = await uploadOne(file, targetCase);
        if (error) {
          setStatus({ kind: "error", message: `${file.name}: ${error}` });
          break;
        }
        uploaded.push(file.name);
      } catch {
        setStatus({ kind: "error", message: `${file.name}: ${t("errors.generic")}` });
        break;
      }
    }
    if (fileInput.current) fileInput.current.value = "";
    if (cameraInput.current) cameraInput.current.value = "";
    if (uploaded.length > 0) {
      setStatus((s) => (s.kind === "error" ? s : { kind: "done", names: uploaded }));
      router.refresh();
    }
  }

  const busy = status.kind === "uploading";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      {!caseId && cases && cases.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="upload-case">{t("caseLabel")}</Label>
          <select
            id="upload-case"
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value)}
            className="h-11 rounded-lg border border-input bg-card px-3 text-base text-foreground"
          >
            <option value="">{t("noCase")}</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground disabled:opacity-60"
        >
          <FileUp className="size-5" aria-hidden />
          {t("chooseFiles")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraInput.current?.click()}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border px-4 text-base font-medium text-foreground disabled:opacity-60"
        >
          <Camera className="size-5" aria-hidden />
          {t("takePhoto")}
        </button>
      </div>
      <input ref={fileInput} type="file" multiple accept={PORTAL_UPLOAD_ACCEPT} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />

      <p className="text-xs text-muted-foreground">{t("rules")}</p>

      {status.kind === "uploading" && (
        <div className="flex flex-col gap-1" aria-live="polite">
          <p className="truncate text-sm text-foreground">{t("uploading", { name: status.name })}</p>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${status.percent}%` }} />
          </div>
        </div>
      )}
      {status.kind === "done" && (
        <p className="flex items-start gap-2 text-sm text-foreground" role="status">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          {t("done", { count: status.names.length })}
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

"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DOCUMENT_ACCEPT, uploadErrorKey } from "@/components/documents/documentUploadShared";

export function AllianceDocumentUploader({ allianceId }: { allianceId: string }) {
  const t = useTranslations("Alliances");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorKey(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("allianceId", allianceId);

    try {
      const res = await fetch("/api/alliance-documents/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setErrorKey(uploadErrorKey(body));
        return;
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setErrorKey("uploadError");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input ref={fileInputRef} type="file" accept={DOCUMENT_ACCEPT} className="sm:max-w-xs" />
        <Button type="button" size="sm" onClick={handleUpload} disabled={uploading}>
          <Upload className="h-4 w-4" />
          {uploading ? t("documents.uploading") : t("documents.upload")}
        </Button>
      </div>
      {errorKey && <p className="text-sm text-destructive">{t(`documents.${errorKey}`)}</p>}
    </div>
  );
}

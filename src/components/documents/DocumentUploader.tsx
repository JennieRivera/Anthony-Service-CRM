"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DocumentUploader({
  clientId,
  caseId,
}: {
  clientId: string;
  caseId?: string;
}) {
  const t = useTranslations("Documents");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(false);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", clientId);
    if (caseId) formData.append("caseId", caseId);
    if (documentType) formData.append("documentType", documentType);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");

      if (fileInputRef.current) fileInputRef.current.value = "";
      setDocumentType("");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input ref={fileInputRef} type="file" className="sm:max-w-xs" />
        <Input
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          placeholder={t("documentTypePlaceholder")}
          className="sm:max-w-xs"
        />
        <Button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          size="sm"
        >
          <Upload className="h-4 w-4" />
          {uploading ? t("uploading") : t("upload")}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{t("uploadError")}</p>
      )}
    </div>
  );
}

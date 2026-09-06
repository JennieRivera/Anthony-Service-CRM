"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { selectableDocumentCategoryValues } from "@/lib/validation/documentCategory";
import { DOCUMENT_ACCEPT, uploadErrorKey } from "./documentUploadShared";

export function GeneralDocumentUploadDialog({
  clients,
  cases,
  initialCategory,
}: {
  clients: { id: string; fullName: string }[];
  cases: { id: string; title: string; clientId: string }[];
  // Pre-fills the folder picker with whichever folder is currently open in
  // the sidebar, so uploading while browsing "Contracts" lands there by
  // default instead of "Other".
  initialCategory?: string;
}) {
  const t = useTranslations("Documents");
  const tCategory = useTranslations("DocumentCategory");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [category, setCategory] = useState(initialCategory || "other");
  const [uploading, setUploading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const casesForClient = useMemo(
    () => cases.filter((c) => c.clientId === clientId),
    [cases, clientId],
  );

  function reset() {
    setClientId("");
    setCaseId("");
    setDocumentType("");
    setCategory(initialCategory || "other");
    setErrorKey(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !clientId) return;

    setUploading(true);
    setErrorKey(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", clientId);
    if (caseId) formData.append("caseId", caseId);
    if (documentType) formData.append("documentType", documentType);
    formData.append("category", category);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setErrorKey(uploadErrorKey(body));
        return;
      }

      reset();
      setOpen(false);
      router.refresh();
    } catch {
      setErrorKey("uploadError");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Upload className="h-4 w-4" />
        {t("uploadDocument")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("uploadDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("selectClient")}</Label>
            <Select
              value={clientId}
              onValueChange={(value) => {
                setClientId(value ?? "");
                setCaseId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectClientPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {clientId && (
            <div className="flex flex-col gap-1.5">
              <Label>{t("selectCaseOptional")}</Label>
              <Select
                value={caseId || "none"}
                onValueChange={(value) => setCaseId(!value || value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noCaseOption")}</SelectItem>
                  {casesForClient.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>{t("selectCategory")}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "other")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectableDocumentCategoryValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {tCategory(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("documentTypePlaceholder")}</Label>
            <Input
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              placeholder={t("documentTypePlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Input ref={fileInputRef} type="file" accept={DOCUMENT_ACCEPT} />
          </div>

          {errorKey && (
            <p className="text-sm text-destructive">{t(errorKey)}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !clientId}
          >
            {uploading ? t("uploading") : t("upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

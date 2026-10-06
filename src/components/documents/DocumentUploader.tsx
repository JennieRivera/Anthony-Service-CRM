"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { immigrationDocumentFolderValues } from "@/lib/validation/immigrationDocumentFolder";
import { selectableDocumentCategoryValues } from "@/lib/validation/documentCategory";
import { DOCUMENT_ACCEPT, uploadErrorKey } from "./documentUploadShared";
import { FilePickerButton } from "./FilePickerButton";
import { SERVICE_FOLDERS, type ServiceFolder } from "@/lib/validation/documentDrawer";

const CLIENTS_FOLDER = "clientes";

export function DocumentUploader({
  clientId,
  caseId,
  referralId,
  showFolderSelect,
  defaultCategory,
  serviceFolder,
  chooseServiceFolder,
  defaultServiceFolder,
}: {
  clientId: string;
  caseId?: string;
  // Files a document under a referral in the Documents cabinet's
  // "Referidos y Alianzas" drawer, independent of caseId.
  referralId?: string;
  // Only meaningful for an Immigration Administrative Services case
  // (spec section 6) — every other case type omits the folder picker.
  showFolderSelect?: boolean;
  defaultCategory?: string;
  // Documents archive folder. Fixed when uploading from inside a service
  // folder of the archive; chosen by staff ("Service / folder") on the
  // client record, starting from defaultServiceFolder (null = Clients).
  // Case and referral uploads need neither (the server decides).
  serviceFolder?: ServiceFolder | null;
  chooseServiceFolder?: boolean;
  defaultServiceFolder?: ServiceFolder | null;
}) {
  const t = useTranslations("Documents");
  const tFolder = useTranslations("ImmigrationDocumentFolder");
  const tCategory = useTranslations("DocumentCategory");
  const tService = useTranslations("ServiceType");
  const tDrawer = useTranslations("DocumentDrawer");
  const [folderChoice, setFolderChoice] = useState<string>(defaultServiceFolder ?? CLIENTS_FOLDER);
  const router = useRouter();
  const [documentType, setDocumentType] = useState("");
  const [folder, setFolder] = useState("");
  const [category, setCategory] = useState(defaultCategory ?? "other");
  const [uploading, setUploading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  async function handleUpload() {
    if (!file) {
      setErrorKey("chooseFileFirst");
      return;
    }

    setUploading(true);
    setErrorKey(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", clientId);
    if (caseId) formData.append("caseId", caseId);
    if (referralId) formData.append("referralId", referralId);
    if (documentType) formData.append("documentType", documentType);
    const archiveFolder = serviceFolder ?? (chooseServiceFolder && folderChoice !== CLIENTS_FOLDER ? folderChoice : null);
    if (archiveFolder) formData.append("serviceType", archiveFolder);
    if (showFolderSelect && folder) {
      formData.append("folder", folder);
    } else {
      formData.append("category", category);
    }

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

      setFile(null);
      setDocumentType("");
      setFolder("");
      setCategory(defaultCategory ?? "other");
      router.refresh();
      toast.success(t("uploadSuccess"));
    } catch {
      setErrorKey("uploadError");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <FilePickerButton
          accept={DOCUMENT_ACCEPT}
          file={file}
          onFileChange={(next) => {
            setFile(next);
            setErrorKey(null);
          }}
          disabled={uploading}
        />
        <Input
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          placeholder={t("documentTypePlaceholder")}
          className="sm:max-w-xs"
        />
        {chooseServiceFolder && (
          <Select value={folderChoice} onValueChange={(v) => setFolderChoice(v ?? CLIENTS_FOLDER)}>
            <SelectTrigger className="sm:max-w-xs" aria-label={t("serviceFolder")} title={t("serviceFolder")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CLIENTS_FOLDER}>{tDrawer("clientes")}</SelectItem>
              {SERVICE_FOLDERS.map((s) => (
                <SelectItem key={s} value={s}>
                  {tService(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {showFolderSelect ? (
          <Select
            value={folder || "none"}
            onValueChange={(v) => setFolder(!v || v === "none" ? "" : v)}
          >
            <SelectTrigger className="sm:max-w-xs">
              <SelectValue placeholder={t("selectFolder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("noFolder")}</SelectItem>
              {immigrationDocumentFolderValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {tFolder(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={category} onValueChange={(v) => setCategory(v ?? "other")}>
            <SelectTrigger className="sm:max-w-xs">
              <SelectValue placeholder={t("selectCategory")} />
            </SelectTrigger>
            <SelectContent>
              {selectableDocumentCategoryValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {tCategory(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
      {errorKey && (
        <p className="text-sm text-destructive">{t(errorKey)}</p>
      )}
    </div>
  );
}

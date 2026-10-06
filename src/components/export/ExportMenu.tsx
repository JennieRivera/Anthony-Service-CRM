"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronDown, Download, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ExportFormat } from "@/lib/export/document";
import type { ExportList } from "@/lib/export/lists";
import type { ExportRecord } from "@/lib/export/records";

// "Export ▾". A list sends the ids it is showing (in order, after its own
// filters/search/sort); a record sends its own id. The file is generated
// on the server and downloaded here — nothing is stored anywhere.
type Target =
  | { kind: "list"; list: ExportList; ids: string[] }
  | { kind: "record"; type: ExportRecord; id: string };

const ICONS = { csv: FileSpreadsheet, pdf: FileText, docx: FileType } as const;

export function ExportMenu({ target }: { target: Target }) {
  const t = useTranslations("Export");
  const locale = useLocale() === "en" ? "en" : "es";
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const formats: ExportFormat[] = target.kind === "list" ? ["csv", "pdf", "docx"] : ["pdf", "docx"];

  async function download(format: ExportFormat) {
    setBusy(format);
    try {
      const res =
        target.kind === "list"
          ? await fetch("/api/export/list", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ list: target.list, format, ids: target.ids, locale }),
            })
          : await fetch(`/api/export/record/${target.type}/${target.id}?format=${format}&locale=${locale}`);
      if (!res.ok) {
        toast.error(res.status === 403 ? t("forbidden") : t("failed"));
        return;
      }
      const name =
        /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `export.${format}`;
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t("downloaded", { name }));
    } catch {
      toast.error(t("failed"));
    } finally {
      setBusy(null);
    }
  }

  const empty = target.kind === "list" && target.ids.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" disabled={busy !== null || empty} />}>
        <Download className="h-4 w-4" />
        {busy ? t("exporting") : t("export")}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {formats.map((format) => {
          const Icon = ICONS[format];
          return (
            <DropdownMenuItem key={format} onClick={() => download(format)}>
              <Icon className="h-4 w-4" />
              {t(`formats.${format}`)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

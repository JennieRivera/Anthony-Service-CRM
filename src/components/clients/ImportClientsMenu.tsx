"use client";

import { useState } from "react";
import Papa from "papaparse";
import { useTranslations } from "next-intl";
import { ChevronDown, FileDown, Upload } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilePickerButton } from "@/components/documents/FilePickerButton";
import { MAX_IMPORT_ROWS, mapHeader, templateCsv, type ImportField } from "@/lib/import/clientsShared";
import {
  importClientsAction,
  previewClientImportAction,
  type ImportPreviewRow,
  type ImportSummary,
} from "@/app/[locale]/(app)/clients/import-actions";

type Stage = "pick" | "preview" | "done";

// "Import ▾" on the Clients list: download the CSV template, or upload a
// CSV → preview (errors and duplicates marked) → "Import N clients" →
// summary. Nothing is saved before that button.
export function ImportClientsMenu() {
  const t = useTranslations("Import");
  const tService = useTranslations("ServiceType");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Partial<Record<ImportField, string>>[]>([]);
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [update, setUpdate] = useState<Set<number>>(new Set());
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStage("pick");
    setFile(null);
    setRows([]);
    setPreview([]);
    setUpdate(new Set());
    setSummary(null);
    setError(null);
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([templateCsv(`${tService("tax_prep")}; ${tService("notary")}`)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-clientes.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function readFile() {
    if (!file) {
      setError(t("chooseFileFirst"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const textValue = (await file.text()).replace(/^﻿/, "");
      const parsed = Papa.parse<Record<string, string>>(textValue, { header: true, skipEmptyLines: "greedy" });
      const fields = parsed.meta.fields ?? [];
      const mapping = new Map(fields.map((f) => [f, mapHeader(f)]));
      if (![...mapping.values()].includes("fullName")) {
        setError(t("noNameColumn"));
        return;
      }
      if (parsed.data.length === 0) {
        setError(t("emptyFile"));
        return;
      }
      if (parsed.data.length > MAX_IMPORT_ROWS) {
        setError(t("tooManyRows", { max: MAX_IMPORT_ROWS }));
        return;
      }
      const mapped = parsed.data.map((record) => {
        const out: Partial<Record<ImportField, string>> = {};
        for (const [header, field] of mapping) if (field) out[field] = String(record[header] ?? "");
        return out;
      });
      const result = await previewClientImportAction(mapped);
      setRows(mapped);
      setPreview(result);
      setStage("preview");
    } catch {
      setError(t("readError"));
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setBusy(true);
    setError(null);
    try {
      setSummary(await importClientsAction(rows, [...update]));
      setStage("done");
      router.refresh();
    } catch {
      setError(t("importError"));
    } finally {
      setBusy(false);
    }
  }

  const willCreate = preview.filter((r) => r.errors.length === 0 && !r.duplicate).length;
  const willUpdate = preview.filter((r) => r.duplicate?.kind === "existing" && update.has(r.index)).length;
  const withErrors = preview.filter((r) => r.errors.length > 0).length;
  const duplicates = preview.filter((r) => r.duplicate).length;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          <Upload className="h-4 w-4" />
          {t("import")}
          <ChevronDown className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem
            onClick={() => {
              reset();
              setOpen(true);
            }}
          >
            <Upload className="h-4 w-4" />
            {t("uploadCsv")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={downloadTemplate}>
            <FileDown className="h-4 w-4" />
            {t("downloadTemplate")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          {stage === "pick" && (
            <div className="flex flex-col gap-3">
              <FilePickerButton accept=".csv,text/csv" file={file} onFileChange={(f) => { setFile(f); setError(null); }} disabled={busy} />
              <button type="button" className="w-fit cursor-pointer text-sm text-primary underline" onClick={downloadTemplate}>
                {t("downloadTemplate")}
              </button>
            </div>
          )}

          {stage === "preview" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">{t("countNew", { count: willCreate })}</Badge>
                <Badge variant="outline">{t("countDuplicates", { count: duplicates })}</Badge>
                <Badge variant="outline">{t("countErrors", { count: withErrors })}</Badge>
              </div>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">{t("colName")}</th>
                      <th className="p-2">{t("colPhone")}</th>
                      <th className="p-2">{t("colEmail")}</th>
                      <th className="p-2">{t("colResult")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r) => (
                      <tr key={r.index} className="border-t border-border align-top">
                        <td className="p-2 text-muted-foreground">{r.index + 2}</td>
                        <td className="p-2">{r.fullName || "—"}</td>
                        <td className="p-2 whitespace-nowrap">{r.phone ?? "—"}</td>
                        <td className="p-2">{r.email ?? "—"}</td>
                        <td className="p-2">
                          {r.errors.length > 0 ? (
                            <span className="text-destructive">{r.errors.map((e) => t(`errors.${e}`)).join(" · ")}</span>
                          ) : r.duplicate?.kind === "in_file" ? (
                            <span className="text-amber-800">{t("duplicateInFile", { row: r.duplicate.firstRow + 2 })}</span>
                          ) : r.duplicate?.kind === "existing" ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-amber-800">
                                {t(r.duplicate.by === "phone" ? "duplicateByPhone" : "duplicateByEmail", { name: r.duplicate.clientName })}
                              </span>
                              <div className="flex gap-1">
                                {(["skip", "update"] as const).map((choice) => {
                                  const active = choice === "update" ? update.has(r.index) : !update.has(r.index);
                                  return (
                                    <button
                                      key={choice}
                                      type="button"
                                      onClick={() =>
                                        setUpdate((prev) => {
                                          const next = new Set(prev);
                                          if (choice === "update") next.add(r.index);
                                          else next.delete(r.index);
                                          return next;
                                        })
                                      }
                                      className={`cursor-pointer rounded border px-2 py-0.5 text-xs ${active ? "border-primary bg-secondary text-foreground" : "border-border text-muted-foreground"}`}
                                    >
                                      {t(choice)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-foreground">{t("ok")}</span>
                          )}
                          {r.warnings.length > 0 && (
                            <span className="block text-xs text-muted-foreground">
                              {r.warnings.map((w) => t(`warnings.${w.kind}`, { value: w.value })).join(" · ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {stage === "done" && summary && (
            <div className="flex flex-col gap-2 text-sm">
              <p className="font-medium text-foreground">{t("summaryCreated", { count: summary.created })}</p>
              {summary.updated > 0 && <p className="text-foreground">{t("summaryUpdated", { count: summary.updated })}</p>}
              <p className="text-foreground">{t("summarySkipped", { count: summary.skipped.length })}</p>
              {summary.skipped.length > 0 && (
                <ul className="list-disc pl-5 text-muted-foreground">
                  {summary.skipped.map((s) => (
                    <li key={s.index}>
                      {t("skippedRow", { row: s.index + 2, name: s.fullName || "—" })}: {t(`skipReasons.${s.reason}`)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            {stage === "pick" && (
              <Button type="button" onClick={readFile} disabled={busy}>
                {busy ? t("reading") : t("preview")}
              </Button>
            )}
            {stage === "preview" && (
              <>
                <Button type="button" variant="outline" onClick={reset} disabled={busy}>
                  {t("chooseAnother")}
                </Button>
                <Button type="button" onClick={runImport} disabled={busy || willCreate + willUpdate === 0}>
                  {busy ? t("importing") : t("importN", { count: willCreate + willUpdate })}
                </Button>
              </>
            )}
            {stage === "done" && (
              <Button type="button" onClick={() => setOpen(false)}>
                {t("close")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

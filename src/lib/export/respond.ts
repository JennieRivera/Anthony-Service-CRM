import { NextResponse } from "next/server";
import { businessDateString } from "@/lib/dates";
import { requireAccessArea } from "@/lib/permissions";
import { renderCsv } from "./csv";
import { renderDocx } from "./docx";
import { renderPdf } from "./pdf";
import { usDateTime, type ExportDoc, type ExportFormat } from "./document";
import type { ExportT } from "./translator";

const CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// requireAccessArea() records the denial in the audit log and throws.
export async function exportGuard(area: "data_export" | "data_import"): Promise<NextResponse | null> {
  try {
    await requireAccessArea(area);
    return null;
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
}

export function exportedLabel(tr: ExportT): string {
  return tr.t("Export.exportedOn", { date: usDateTime(new Date()) });
}

// Generated in memory and streamed straight back — nothing is written to
// disk or Blob storage.
export async function exportResponse(doc: ExportDoc, format: ExportFormat): Promise<NextResponse> {
  const body = format === "csv" ? renderCsv(doc) : format === "pdf" ? await renderPdf(doc) : await renderDocx(doc);
  // ASCII-only file name (accents dropped: "Pérez" → "Perez").
  const safeBase =
    doc.fileBase
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "export";
  const fileName = `${safeBase}_${businessDateString()}.${format}`;
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

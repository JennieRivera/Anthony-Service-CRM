import Papa from "papaparse";
import type { ExportDoc } from "./document";

// UTF-8 with a BOM so Excel opens accents (á, ñ) correctly. A list export
// has one table; the CSV is that table.
export function renderCsv(doc: ExportDoc): Buffer {
  const table = doc.sections.find((s) => s.table)?.table ?? { columns: [], rows: [] };
  // escapeFormulae: a value starting with = + - @ can't run as an Excel
  // formula (CSV injection) — it's prefixed with a quote.
  const csv = Papa.unparse(
    { fields: table.columns, data: table.rows },
    { newline: "\r\n", escapeFormulae: true },
  );
  return Buffer.from(`﻿${csv}`, "utf8");
}

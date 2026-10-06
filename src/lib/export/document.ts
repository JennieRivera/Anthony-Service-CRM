import { BUSINESS_TIME_ZONE } from "@/lib/dates";
import { maskSensitive } from "./mask";

// One neutral shape for every export: a list export is one table section;
// a record export (client, case, …) is several sections. The CSV, PDF and
// Word writers all render this same shape, so they can't drift apart.

export type ExportTable = { columns: string[]; rows: string[][] };

export type ExportSection = {
  heading: string;
  fields?: [label: string, value: string][];
  table?: ExportTable;
  // Shown when a table has no rows.
  empty?: string;
};

export type ExportDoc = {
  title: string;
  subtitle?: string;
  // "Exported 10/06/2026 3:15 PM" — already localized.
  exportedLabel: string;
  sections: ExportSection[];
  // Footer notice (e.g. "not a law firm"), localized.
  footerNote?: string;
  // Wide tables print in landscape.
  landscape: boolean;
  fileBase: string;
};

export const EXPORT_FORMATS = ["csv", "pdf", "docx"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const BRAND = {
  name: "Anthony Multiservice, LLC",
  navy: "#1C2B3E",
  blue: "#477297",
  gold: "#C8A96B",
  cream: "#F6F5F0",
  border: "#EDE2C8",
};

// US formats, Florida time: 10/06/2026 and 10/06/2026 3:15 PM.
export function usDate(value: Date | string | null | undefined): string {
  if (value == null || value === "") return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${m}/${d}/${y}`;
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function usDateTime(value: Date | string | null | undefined): string {
  if (value == null || value === "") return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function money(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

// Free text from the database (notes, titles, summaries): masked, never raw.
export function text(value: string | null | undefined): string {
  return value ? maskSensitive(value) : "";
}

export function landscapeFor(columns: number): boolean {
  return columns > 5;
}

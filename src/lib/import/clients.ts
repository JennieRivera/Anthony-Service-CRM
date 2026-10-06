import { z } from "zod";
import { formatUsPhone, usPhoneDigits } from "@/lib/validation/onlineBooking";
import { serviceTypeValues } from "@/lib/validation/client";
import { LEGACY_SERVICE_LABELS_EN } from "@/lib/booking/titles";
import en from "../../../messages/en.json";
import { plain, type ImportField } from "./clientsShared";
export { MAX_IMPORT_ROWS, mapHeader, type ImportField } from "./clientsShared";
import es from "../../../messages/es.json";

// Clients CSV import: header mapping, per-row validation and duplicate
// detection. Pure functions — the Server Actions in
// src/app/[locale]/(app)/clients/import-actions.ts run them on the
// server both for the preview and again when importing, so nothing the
// browser sends is trusted.

// Service names accepted in the CSV: the key, or its English/Spanish label.
const SERVICE_LOOKUP = new Map<string, (typeof serviceTypeValues)[number]>();
// Spanish names used before the 2026-10-06 rename — older spreadsheets
// still say e.g. "Taxes / Contabilidad". (The old English names come from
// LEGACY_SERVICE_LABELS_EN, shared with the stored-title parser.)
const LEGACY_SERVICE_LABELS_ES: Partial<Record<(typeof serviceTypeValues)[number], string>> = {
  online_notary: "Notary Public en Línea (RON)",
  tax_prep: "Taxes / Contabilidad",
  company_registration: "Registro de Compañía",
  credit_financing: "Crédito y Financiamiento",
  notary: "Notary Public / RON / IPEN / Firma de Préstamos",
  bookkeeping: "Contabilidad",
  marketing: "Marketing / Marca / IA / Automatización",
  irs_administrative: "Administrativo IRS / EIN / ITIN",
};
for (const legacy of [LEGACY_SERVICE_LABELS_EN, LEGACY_SERVICE_LABELS_ES]) {
  for (const [key, name] of Object.entries(legacy)) {
    SERVICE_LOOKUP.set(plain(name), key as (typeof serviceTypeValues)[number]);
  }
}
// Current names last, so they always win.
for (const key of serviceTypeValues) {
  SERVICE_LOOKUP.set(plain(key), key);
  SERVICE_LOOKUP.set(plain((en.ServiceType as Record<string, string>)[key] ?? key), key);
  SERVICE_LOOKUP.set(plain((es.ServiceType as Record<string, string>)[key] ?? key), key);
}

export type ImportRowInput = Partial<Record<ImportField, string>>;

export type ParsedImportRow = {
  fullName: string;
  phone: string | null;
  phoneDigits: string | null;
  email: string | null;
  language: "en" | "es";
  address: string | null;
  services: (typeof serviceTypeValues)[number][];
  referralSource: string | null;
  notes: string | null;
};

export type RowError = "name_missing" | "phone_invalid" | "email_invalid" | "too_long";
export type RowWarning = { kind: "unknown_service"; value: string } | { kind: "unknown_language"; value: string };

export type ValidatedRow = {
  index: number;
  data: ParsedImportRow;
  errors: RowError[];
  warnings: RowWarning[];
};

const emailSchema = z.string().email();
const clean = (v: string | undefined) => (v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

export function validateImportRow(input: ImportRowInput, index: number): ValidatedRow {
  const errors: RowError[] = [];
  const warnings: RowWarning[] = [];

  const fullName = clean(input.fullName);
  if (!fullName) errors.push("name_missing");

  const rawPhone = clean(input.phone);
  const phoneDigits = rawPhone ? usPhoneDigits(rawPhone) : null;
  if (rawPhone && !phoneDigits) errors.push("phone_invalid");

  const rawEmail = clean(input.email).toLowerCase();
  if (rawEmail && !emailSchema.safeParse(rawEmail).success) errors.push("email_invalid");

  const rawLanguage = plain(clean(input.language));
  let language: "en" | "es" = "es";
  if (["en", "english", "ingles", "inglés"].includes(rawLanguage)) language = "en";
  else if (rawLanguage && !["es", "spanish", "espanol", "español"].includes(rawLanguage)) {
    warnings.push({ kind: "unknown_language", value: clean(input.language) });
  }

  const services: ParsedImportRow["services"] = [];
  for (const part of clean(input.services).split(/[;,|]/)) {
    const name = part.trim();
    if (!name) continue;
    const key = SERVICE_LOOKUP.get(plain(name));
    if (key) {
      if (!services.includes(key)) services.push(key);
    } else warnings.push({ kind: "unknown_service", value: name });
  }

  const address = clean(input.address);
  const referralSource = clean(input.referralSource);
  const notes = clean(input.notes);
  if (fullName.length > 200 || address.length > 300 || referralSource.length > 200 || notes.length > 5000) {
    errors.push("too_long");
  }

  return {
    index,
    errors,
    warnings,
    data: {
      fullName,
      phone: phoneDigits ? formatUsPhone(phoneDigits) : null,
      phoneDigits,
      email: rawEmail && !errors.includes("email_invalid") ? rawEmail : null,
      language,
      address: address || null,
      services,
      referralSource: referralSource || null,
      notes: notes || null,
    },
  };
}

export type ExistingClient = { id: string; fullName: string; phone: string | null; email: string | null };

export type Duplicate =
  | { kind: "existing"; clientId: string; clientName: string; by: "phone" | "email" }
  | { kind: "in_file"; firstRow: number };

// Same phone (by digits) or same email — against existing clients, and
// against an earlier row of the same file.
export function findDuplicates(rows: ValidatedRow[], existing: ExistingClient[]): Map<number, Duplicate> {
  const byPhone = new Map<string, ExistingClient>();
  const byEmail = new Map<string, ExistingClient>();
  for (const c of existing) {
    const digits = c.phone ? usPhoneDigits(c.phone) : null;
    if (digits && !byPhone.has(digits)) byPhone.set(digits, c);
    if (c.email && !byEmail.has(c.email.toLowerCase())) byEmail.set(c.email.toLowerCase(), c);
  }
  const seenPhone = new Map<string, number>();
  const seenEmail = new Map<string, number>();
  const out = new Map<number, Duplicate>();
  for (const row of rows) {
    if (row.errors.length > 0) continue;
    const { phoneDigits, email } = row.data;
    const match = (phoneDigits && byPhone.get(phoneDigits)) || (email && byEmail.get(email));
    if (match) {
      out.set(row.index, {
        kind: "existing",
        clientId: match.id,
        clientName: match.fullName,
        by: phoneDigits && byPhone.get(phoneDigits) ? "phone" : "email",
      });
    } else {
      const first =
        (phoneDigits ? seenPhone.get(phoneDigits) : undefined) ?? (email ? seenEmail.get(email) : undefined);
      if (first !== undefined) out.set(row.index, { kind: "in_file", firstRow: first });
    }
    if (phoneDigits && !seenPhone.has(phoneDigits)) seenPhone.set(phoneDigits, row.index);
    if (email && !seenEmail.has(email)) seenEmail.set(email, row.index);
  }
  return out;
}

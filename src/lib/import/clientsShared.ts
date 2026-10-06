// Clients CSV import — the parts the browser also needs (header mapping,
// row limit, the template). No message files or database code here; the
// server-side validation lives in ./clients.ts.

export const MAX_IMPORT_ROWS = 1000;

export type ImportField =
  | "fullName"
  | "phone"
  | "email"
  | "language"
  | "address"
  | "services"
  | "referralSource"
  | "notes";

// Template columns (Spanish, as the owner works) — English names are
// accepted too.
export const TEMPLATE_HEADERS: Record<ImportField, string> = {
  fullName: "nombre_completo",
  phone: "telefono",
  email: "correo",
  language: "idioma",
  address: "direccion",
  services: "servicios_de_interes",
  referralSource: "fuente_de_referencia",
  notes: "notas",
};

const HEADER_ALIASES: Record<string, ImportField> = {
  nombre_completo: "fullName",
  nombre: "fullName",
  full_name: "fullName",
  fullname: "fullName",
  name: "fullName",
  telefono: "phone",
  phone: "phone",
  celular: "phone",
  correo: "email",
  correo_electronico: "email",
  email: "email",
  idioma: "language",
  language: "language",
  direccion: "address",
  address: "address",
  servicios_de_interes: "services",
  servicios: "services",
  interested_services: "services",
  services: "services",
  fuente_de_referencia: "referralSource",
  fuente: "referralSource",
  referral_source: "referralSource",
  notas: "notes",
  notes: "notes",
};

export const plain = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

export function mapHeader(header: string): ImportField | null {
  return HEADER_ALIASES[plain(header).replace(/[\s-]+/g, "_")] ?? null;
}

// serviceExample: two service names in the CSV language, e.g. from
// useTranslations("ServiceType").
export function templateCsv(serviceExample: string): string {
  const headers = Object.values(TEMPLATE_HEADERS);
  const example = [
    "Ana Pérez (EJEMPLO)",
    "(407) 555-0101",
    "ana.ejemplo@example.com",
    "es",
    "123 Main St, Kissimmee, FL 34741",
    serviceExample,
    "Facebook",
    "Fila de ejemplo — bórrela antes de importar",
  ];
  const quote = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return `﻿${headers.join(",")}\r\n${example.map(quote).join(",")}\r\n`;
}

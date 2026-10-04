import type { ServiceType } from "./config";

// Online-booking appointment and task titles are STORED in English (one
// stable format staff, exports and search all see the same way), e.g.
//   appointment: "Online booking — Document Preparation: Ana Pérez"
//   task:        "Confirm: Online booking — Document Preparation: Ana Pérez"
//                "… — Client requested Spanish for this booking."
// and only TRANSLATED AT DISPLAY TIME via localizeBookingTitle(). Anything
// that doesn't match this exact format (every staff-written title) is
// returned unchanged.

// English service labels used in the stored title. Must equal
// messages/en.json → ServiceType (enforced by titles.test.ts), so the
// title reads exactly like the rest of the English UI.
export const SERVICE_LABELS_EN: Record<ServiceType, string> = {
  online_notary: "Online Notary",
  document_prep: "Document Preparation",
  tax_prep: "Tax & Accounting",
  company_registration: "Company Registration",
  credit_financing: "Credit & Financing",
  leadership: "Business Consulting",
  notary: "Notary / RON / IPEN / Loan Signing",
  bookkeeping: "Bookkeeping / Accounting Support",
  immigration: "Immigration Administrative Services",
  academy: "Academy / Training",
  marketing: "Marketing / Branding / AI / Automation",
  sales_tax: "Sales Tax Registration",
  irs_administrative: "IRS / EIN / ITIN Administrative",
  insurance_compliance: "Insurance & Compliance",
};

const PREFIX = "Online booking — ";
const CONFIRM = "Confirm: ";
const LANGUAGE_NAMES_EN = { en: "English", es: "Spanish" } as const;

export function buildBookingTitle(serviceType: ServiceType, fullName: string): string {
  return `${PREFIX}${SERVICE_LABELS_EN[serviceType]}: ${fullName}`;
}

export function bookingLanguageNote(language: "en" | "es"): string {
  return ` — Client requested ${LANGUAGE_NAMES_EN[language]} for this booking.`;
}

const LABEL_TO_SERVICE = new Map(
  Object.entries(SERVICE_LABELS_EN).map(([key, label]) => [label, key as ServiceType]),
);

const LANGUAGE_NOTE = / — Client requested (English|Spanish) for this booking\.$/;

export type ParsedBookingTitle = {
  confirm: boolean;
  serviceType: ServiceType;
  name: string;
  requestedLanguage: "en" | "es" | null;
};

export function parseBookingTitle(title: string): ParsedBookingTitle | null {
  let rest = title;
  const confirm = rest.startsWith(CONFIRM);
  if (confirm) rest = rest.slice(CONFIRM.length);
  if (!rest.startsWith(PREFIX)) return null;
  rest = rest.slice(PREFIX.length);

  let requestedLanguage: ParsedBookingTitle["requestedLanguage"] = null;
  const note = rest.match(LANGUAGE_NOTE);
  if (note) {
    requestedLanguage = note[1] === "Spanish" ? "es" : "en";
    rest = rest.slice(0, note.index);
  }

  // Longest label first, so no label can shadow a longer one.
  const labels = [...LABEL_TO_SERVICE.keys()].sort((a, b) => b.length - a.length);
  const label = labels.find((l) => rest.startsWith(`${l}: `));
  if (!label) return null;

  return {
    confirm,
    serviceType: LABEL_TO_SERVICE.get(label)!,
    name: rest.slice(label.length + 2),
    requestedLanguage,
  };
}

// Translator functions come from next-intl (getTranslations on the
// server, useTranslations in client components), so this file stays free
// of any next-intl import and works in both.
export type BookingTitleTranslators = {
  service: (serviceType: ServiceType) => string;
  // AppointmentSource namespace: online_booking, confirmPrefix,
  // requestedLanguage ({language}), language_en, language_es.
  source: (key: string, values?: Record<string, string>) => string;
};

export function localizeBookingTitle(title: string, t: BookingTitleTranslators): string {
  const parsed = parseBookingTitle(title);
  if (!parsed) return title;
  let out = `${t.source("online_booking")} — ${t.service(parsed.serviceType)}: ${parsed.name}`;
  if (parsed.confirm) out = `${t.source("confirmPrefix")}${out}`;
  if (parsed.requestedLanguage) {
    out += ` — ${t.source("requestedLanguage", {
      language: t.source(`language_${parsed.requestedLanguage}`),
    })}`;
  }
  return out;
}

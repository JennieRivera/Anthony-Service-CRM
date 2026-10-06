import type { ServiceType } from "./config";
import { NOTICE_LABELS_EN } from "@/lib/notifications/config";

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

// ── Client portal task titles (Step 2A) ───────────────────────────────
// Same idea: stored in English with a fixed prefix, translated at display
// time. The text after the prefix (a file name, a date, the client's own
// words) is never translated.

const PORTAL_PREFIXES = {
  "Client upload (may contain sensitive data): ": "portalUploadSensitive",
  "Client upload: ": "portalUpload",
  "Client requested cancellation: ": "portalCancelRequest",
  "Client requested reschedule: ": "portalRescheduleRequest",
  // Step 2B
  "Review client info change (phone changed — verify before a new portal link): ": "portalInfoChangePhone",
  "Review client info change: ": "portalInfoChange",
  "Client requested information about: ": "portalServiceInterest",
  // Step 3B
  "Call client (no authorized channel for an automatic notice): ": "callClientNotice",
} as const;

export function buildPortalUploadTitle(fileName: string, mayBeSensitive: boolean): string {
  return mayBeSensitive
    ? `Client upload (may contain sensitive data): ${fileName}`
    : `Client upload: ${fileName}`;
}

// e.g. 'Client requested reschedule: 2026-10-05 3:00 PM — "Can we do 4?"'
// (date/time in Florida business time; language-neutral format).
export function buildPortalChangeRequestTitle(
  kind: "cancel" | "reschedule",
  startAt: Date,
  message: string,
): string {
  const when = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(startAt);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(startAt);
  const prefix = kind === "cancel" ? "Client requested cancellation: " : "Client requested reschedule: ";
  const note = message.trim() ? ` — "${message.trim()}"` : "";
  return `${prefix}${when} ${time}${note}`;
}

// ── Client portal task titles (Step 2B) ───────────────────────────────

const clip = (value: string, max = 120) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

// The English words stored in 2B titles, each translated at display time
// by localizeBookingTitle() (SystemTitles namespace).
export const PROFILE_FIELD_LABELS_EN = {
  phone: "Phone",
  email: "Email",
  address: "Address",
  preferredLanguage: "Language",
  bestTimeToCall: "Best time to call",
} as const;
export const PROFILE_LANGUAGE_LABELS_EN = { en: "English", es: "Spanish" } as const;
export const PROFILE_BEST_TIME_LABELS_EN = {
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  evening: "Evening",
} as const;
const EMPTY_VALUE = "(empty)";
const SEE_COMMENT = "(see comment)";

// e.g. 'Review client info change: Phone: (555) 555-0101 → (555) 555-0199;
// Email: (empty) → ana@example.com'. A phone change gets its own prefix so
// staff verify it before sending a new portal link (the link is confirmed
// with the phone's last 4 digits).
export function buildPortalProfileChangeTitle(
  changes: { label: string; before: string; after: string }[],
  phoneChanged: boolean,
): string {
  const prefix = phoneChanged
    ? "Review client info change (phone changed — verify before a new portal link): "
    : "Review client info change: ";
  const show = (v: string) => (v ? clip(v) : EMPTY_VALUE);
  return `${prefix}${changes.map((c) => `${c.label}: ${show(c.before)} → ${show(c.after)}`).join("; ")}`;
}

// e.g. 'Client requested information about: Tax & Accounting, Company
// Registration — "I need to open an LLC"'.
export function buildPortalServiceInterestTitle(services: ServiceType[], comment: string): string {
  const list = services.length ? services.map((s) => SERVICE_LABELS_EN[s]).join(", ") : SEE_COMMENT;
  const note = comment.trim() ? ` — "${comment.trim()}"` : "";
  return `Client requested information about: ${list}${note}`;
}

// ── Automatic task titles (cases, appointments, crons) ────────────────
// Same idea: a fixed English prefix, translated at display time. The text
// after it (a case or appointment title) is localized again, so
// "24h reminder: Online booking — …" reads fully in Spanish.
const TASK_PREFIXES = {
  "Follow up: ": "taskFollowUp",
  "No-show follow-up: ": "taskNoShowFollowUp",
  "24h reminder: ": "taskReminder24h",
  "2h reminder: ": "taskReminder2h",
  "Inactivity alert: ": "taskInactivity",
  "Renewal due soon: ": "taskRenewalDue",
  "Payment check: ": "taskPaymentCheck",
  "Documents pending: ": "taskDocumentsPending",
  "Close out: ": "taskCloseOut",
  "Confirm: ": "taskConfirm",
} as const;
const TASK_EXACT = {
  "No communication logged recently": "taskNoCommunication",
} as const;

// Translator functions come from next-intl (getTranslations on the
// server, useTranslations in client components), so this file stays free
// of any next-intl import and works in both.
export type BookingTitleTranslators = {
  service: (serviceType: ServiceType) => string;
  // AppointmentSource namespace: online_booking, confirmPrefix,
  // requestedLanguage ({language}), language_en, language_es.
  source: (key: string, values?: Record<string, string>) => string;
  // SystemTitles namespace: the PORTAL_PREFIXES keys above.
  system: (key: string) => string;
};

// Step 2B bodies: field names, "(empty)", language / best-time values and
// service names are translated; what the client typed (phone, email,
// address, comment) is shown as-is. Anything that doesn't parse cleanly is
// returned unchanged.
const FIELD_KEY_BY_LABEL = new Map(
  Object.entries(PROFILE_FIELD_LABELS_EN).map(([key, label]) => [label, key as keyof typeof PROFILE_FIELD_LABELS_EN]),
);
const FIELD_SPLIT = new RegExp(
  `; (?=(?:${[...FIELD_KEY_BY_LABEL.keys()].map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}): )`,
);

function localizeProfileChangeBody(body: string, t: BookingTitleTranslators): string {
  const parts = body.split(FIELD_SPLIT);
  const out: string[] = [];
  for (const part of parts) {
    const label = [...FIELD_KEY_BY_LABEL.keys()].find((l) => part.startsWith(`${l}: `));
    if (!label) return body;
    const field = FIELD_KEY_BY_LABEL.get(label)!;
    const rest = part.slice(label.length + 2);
    const arrow = rest.indexOf(" → ");
    if (arrow < 0) return body;
    const value = (v: string) => {
      if (v === EMPTY_VALUE) return t.system("valueEmpty");
      if (field === "preferredLanguage") {
        const lang = (Object.entries(PROFILE_LANGUAGE_LABELS_EN).find(([, l]) => l === v) ?? [])[0];
        return lang ? t.system(`language_${lang}`) : v;
      }
      if (field === "bestTimeToCall") {
        const time = (Object.entries(PROFILE_BEST_TIME_LABELS_EN).find(([, l]) => l === v) ?? [])[0];
        return time ? t.system(`bestTime_${time}`) : v;
      }
      return v;
    };
    out.push(`${t.system(`field_${field}`)}: ${value(rest.slice(0, arrow))} → ${value(rest.slice(arrow + 3))}`);
  }
  return out.join("; ");
}

function localizeServiceInterestBody(body: string, t: BookingTitleTranslators): string {
  const cut = body.indexOf(' — "');
  const list = cut >= 0 ? body.slice(0, cut) : body;
  const note = cut >= 0 ? body.slice(cut) : "";
  if (list === SEE_COMMENT) return `${t.system("seeComment")}${note}`;
  const services = list.split(", ").map((label) => LABEL_TO_SERVICE.get(label));
  if (services.some((s) => !s)) return body;
  return `${services.map((s) => t.service(s!)).join(", ")}${note}`;
}

export function localizeBookingTitle(title: string, t: BookingTitleTranslators): string {
  for (const [prefix, key] of Object.entries(PORTAL_PREFIXES)) {
    if (!title.startsWith(prefix)) continue;
    const body = title.slice(prefix.length);
    if (key === "portalInfoChange" || key === "portalInfoChangePhone") {
      return `${t.system(key)}${localizeProfileChangeBody(body, t)}`;
    }
    if (key === "callClientNotice") {
      const notice = (Object.entries(NOTICE_LABELS_EN) as [string, string][]).find(([, label]) => label === body)?.[0];
      return `${t.system(key)}${notice ? t.system(`notice_${notice}`) : body}`;
    }
    if (key === "portalServiceInterest") return `${t.system(key)}${localizeServiceInterestBody(body, t)}`;
    return `${t.system(key)}${body}`;
  }
  const parsed = parseBookingTitle(title);
  if (!parsed) {
    const exact = TASK_EXACT[title as keyof typeof TASK_EXACT];
    if (exact) return t.system(exact);
    for (const [prefix, key] of Object.entries(TASK_PREFIXES)) {
      if (title.startsWith(prefix)) return `${t.system(key)}${localizeBookingTitle(title.slice(prefix.length), t)}`;
    }
    return title;
  }
  let out = `${t.source("online_booking")} — ${t.service(parsed.serviceType)}: ${parsed.name}`;
  if (parsed.confirm) out = `${t.source("confirmPrefix")}${out}`;
  if (parsed.requestedLanguage) {
    out += ` — ${t.source("requestedLanguage", {
      language: t.source(`language_${parsed.requestedLanguage}`),
    })}`;
  }
  return out;
}

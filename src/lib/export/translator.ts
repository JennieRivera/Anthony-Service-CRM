import { createTranslator } from "next-intl";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { localizeBookingTitle } from "@/lib/booking/titles";

export type ExportLocale = "en" | "es";

// Route handlers have no [locale] segment, so exports build their own
// translator from the messages file of the locale the page sent.
export function exportTranslator(locale: ExportLocale) {
  const messages = locale === "en" ? en : es;
  const t = createTranslator({ locale, messages });
  const raw = t as unknown as {
    (key: string, values?: Record<string, string | number>): string;
    has: (key: string) => boolean;
  };
  // Enum label with a safe fallback to the stored value.
  const label = (namespace: string, value: string | null | undefined) => {
    if (!value) return "";
    const key = `${namespace}.${value}`;
    return raw.has(key) ? raw(key) : value;
  };
  const title = (value: string) =>
    localizeBookingTitle(value, {
      service: (k) => label("ServiceType", k),
      source: (k, v) => raw(`AppointmentSource.${k}`, v),
      system: (k) => raw(`SystemTitles.${k}`),
    });
  return { t: raw, label, title, locale };
}

export type ExportT = ReturnType<typeof exportTranslator>;

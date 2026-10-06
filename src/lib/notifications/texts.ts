// Default wording of every automatic notice (Step 3B), in "usted". Editable
// in Settings → Automatic notices (notification_texts); a saved row
// replaces the default for that type/channel/language. Pure — safe in
// client components.
//
// Placeholders: {name} (client's first name), {date}, {time}, {link},
// {phone} (business phone); owner alerts also {client} and {kind}.
// SMS always get "Anthony Multiservice: " in front and the STOP line at the
// end, added in code (see renderSms) so an edit can never remove them.
// NEVER put sensitive data here: no SSN, case numbers, amounts or details
// of the matter.

import type { Channel, NoticeType } from "./config";
import { BUSINESS_TIME_ZONE } from "@/lib/dates";

export type NoticeText = { subject?: string; body: string };
export type NoticeTextKey = `${NoticeType}:${Channel}:${"en" | "es"}`;

const T = (subject: string | undefined, body: string): NoticeText => ({ subject, body });

export const DEFAULT_NOTICE_TEXTS: Partial<Record<NoticeTextKey, NoticeText>> = {
  // Appointment confirmed (staff moved it from Requested to Scheduled/Confirmed)
  "appointment_confirmed:sms:es": T(undefined, "Su cita del {date} a las {time} está confirmada. Si necesita cambiarla, llámenos al {phone}."),
  "appointment_confirmed:sms:en": T(undefined, "Your appointment on {date} at {time} is confirmed. To change it, call us at {phone}."),
  "appointment_confirmed:email:es": T(
    "Su cita está confirmada",
    "Hola, {name}:\n\nSu cita del {date} a las {time} (hora de Florida) está confirmada.\n\nSi necesita cambiarla, llámenos al {phone}.",
  ),
  "appointment_confirmed:email:en": T(
    "Your appointment is confirmed",
    "Hello {name},\n\nYour appointment on {date} at {time} (Florida time) is confirmed.\n\nTo change it, please call us at {phone}.",
  ),

  // Reminder ~24 hours before (or the day before, with one daily run)
  "appointment_reminder_24h:sms:es": T(undefined, "Recordatorio: tiene una cita el {date} a las {time}. Si necesita cambiarla, llámenos al {phone}."),
  "appointment_reminder_24h:sms:en": T(undefined, "Reminder: you have an appointment on {date} at {time}. To change it, call us at {phone}."),
  "appointment_reminder_24h:email:es": T(
    "Recordatorio de su cita",
    "Hola, {name}:\n\nLe recordamos que tiene una cita el {date} a las {time} (hora de Florida).\n\nSi necesita cambiarla, llámenos al {phone}.",
  ),
  "appointment_reminder_24h:email:en": T(
    "Appointment reminder",
    "Hello {name},\n\nThis is a reminder of your appointment on {date} at {time} (Florida time).\n\nTo change it, please call us at {phone}.",
  ),

  // Reminder 2 hours before (only with precise reminders / Vercel Pro)
  "appointment_reminder_2h:sms:es": T(undefined, "Recordatorio: su cita es hoy a las {time}."),
  "appointment_reminder_2h:sms:en": T(undefined, "Reminder: your appointment is today at {time}."),
  "appointment_reminder_2h:email:es": T("Su cita es hoy", "Hola, {name}:\n\nLe recordamos que su cita es hoy a las {time} (hora de Florida)."),
  "appointment_reminder_2h:email:en": T("Your appointment is today", "Hello {name},\n\nThis is a reminder that your appointment is today at {time} (Florida time)."),

  // Case update (status changed, or documents requested changed)
  "case_update:sms:es": T(undefined, "Tiene una actualización en su portal: {link}"),
  "case_update:sms:en": T(undefined, "You have an update in your client portal: {link}"),
  "case_update:email:es": T(
    "Tiene una actualización en su portal",
    "Hola, {name}:\n\nTiene una actualización en su portal de cliente. Para verla, entre aquí:\n{link}",
  ),
  "case_update:email:en": T(
    "You have an update in your portal",
    "Hello {name},\n\nThere is an update in your client portal. To see it, go to:\n{link}",
  ),

  // Personal portal link, sent by staff from the client record
  "portal_link:sms:es": T(undefined, "Su link personal para entrar a su portal de cliente: {link} Vence en 7 días."),
  "portal_link:sms:en": T(undefined, "Your personal link to your client portal: {link} It expires in 7 days."),
  "portal_link:email:es": T(
    "Su link para entrar a su portal de cliente",
    "Hola, {name}:\n\nEste es su link personal para entrar a su portal de cliente:\n{link}\n\nVence en 7 días. Al abrirlo, le pediremos los últimos 4 dígitos de su teléfono.",
  ),
  "portal_link:email:en": T(
    "Your link to your client portal",
    "Hello {name},\n\nThis is your personal link to your client portal:\n{link}\n\nIt expires in 7 days. When you open it, we will ask for the last 4 digits of your phone number.",
  ),

  // Owner alerts (email to the owner; never to clients)
  "owner_new_booking:email:es": T(
    "Nueva reserva en línea: {client}",
    "{client} pidió una cita para el {date} a las {time}.\n\nRevísela y confírmela en el CRM:\n{link}",
  ),
  "owner_new_booking:email:en": T(
    "New online booking: {client}",
    "{client} requested an appointment on {date} at {time}.\n\nReview and confirm it in the CRM:\n{link}",
  ),
  "owner_document_uploaded:email:es": T(
    "Documento nuevo de {client}",
    "{client} subió un documento en el portal.\n\nRevíselo en el CRM:\n{link}",
  ),
  "owner_document_uploaded:email:en": T(
    "New document from {client}",
    "{client} uploaded a document through the portal.\n\nReview it in the CRM:\n{link}",
  ),
  "owner_change_request:email:es": T(
    "{client} pidió {kind} una cita",
    "{client} pidió {kind} su cita del {date} a las {time}.\n\nRevise la tarea en el CRM:\n{link}",
  ),
  "owner_change_request:email:en": T(
    "{client} asked to {kind} an appointment",
    "{client} asked to {kind} their appointment on {date} at {time}.\n\nReview the task in the CRM:\n{link}",
  ),
};

// Which channels each type uses (owner alerts are email only).
export function channelsFor(type: NoticeType): Channel[] {
  return type.startsWith("owner_") ? ["email"] : ["sms", "email"];
}

export const SMS_PREFIX = "Anthony Multiservice: ";
export const SMS_STOP_LINE = {
  es: "Responda STOP para no recibir más mensajes.",
  en: "Reply STOP to opt out.",
} as const;

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}

// Business name first and the STOP line last, always — whatever the saved text says.
export function renderSms(body: string, language: "en" | "es", vars: Record<string, string>): string {
  let text = fill(body, vars).trim();
  if (!text.startsWith(SMS_PREFIX.trim())) text = `${SMS_PREFIX}${text}`;
  const stop = SMS_STOP_LINE[language];
  if (!text.includes(stop)) text = `${text} ${stop}`;
  return text;
}

// Dates and times exactly as clients see them elsewhere (Florida time, AM/PM).
export function noticeDate(value: Date, language: "en" | "es"): string {
  return new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(value);
}

export function noticeTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(value);
}

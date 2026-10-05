import { BUSINESS_TIME_ZONE } from "@/lib/dates";

// Client-portal display helpers (pure; safe in server and client code).
// Every date/time is shown in Florida time, times always as "3:00 PM".

export function formatPortalDate(value: Date | string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatPortalShortDate(value: Date | string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatPortalTime(value: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

// What the client sees for a case's status (owner-approved mapping).
export type PortalCaseStatus = "received" | "in_progress" | "waiting_on_you" | "completed" | "closed";

export function portalCaseStatus(status: string): PortalCaseStatus {
  switch (status) {
    case "new":
      return "received";
    case "in_progress":
      return "in_progress";
    case "waiting_on_client":
      return "waiting_on_you";
    case "completed":
      return "completed";
    default:
      return "closed";
  }
}

export const isActiveCaseStatus = (status: string) => status !== "completed" && status !== "cancelled";

// What the client sees for an appointment's status.
export type PortalAppointmentStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "missed";

export function portalAppointmentStatus(status: string): PortalAppointmentStatus {
  switch (status) {
    case "requested":
      return "pending";
    case "scheduled":
    case "confirmed":
      return "confirmed";
    case "checked_in":
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "no_show":
      return "missed";
    default:
      return "cancelled";
  }
}

export const canRequestAppointmentChange = (status: string, startAt: Date | string, now = new Date()) =>
  new Date(startAt) > now && !["cancelled", "completed", "no_show"].includes(status);

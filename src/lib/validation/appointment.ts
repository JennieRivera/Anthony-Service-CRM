import { z } from "zod";
import { serviceTypeValues } from "./client";
import { paymentStatusValues } from "./payment";

// Calendar enhancement, Session 1 — the 4 original values are kept as-is,
// with the 5 new statuses from CALENDAR-PLAN.md section 7 appended,
// matching the appointment_status enum in schema.ts exactly.
export const appointmentStatusValues = [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
  "requested",
  "confirmed",
  "checked_in",
  "in_progress",
  "rescheduled",
] as const;

export const appointmentTypeValues = [
  "in_person",
  "phone",
  "zoom",
  "google_meet",
  "virtual",
  "mobile_service",
  "ron",
  "other",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

// Calendar enhancement, Session 2 (section 3) — clientId is no longer
// always required: an appointment can instead carry a fresh lead's
// name/phone/email/business name, and the server action resolves it to a
// real client row (matching an existing one or creating a new lead) before
// the appointment itself is ever written — see the "REGLA MÁS IMPORTANTE"
// in CALENDAR-PLAN.md, no appointment is created without landing on a real
// client either way. The refine below is what actually enforces "one or
// the other, never neither".
export const appointmentFormSchema = z
  .object({
    clientId: optionalString,
    newClientFullName: optionalString,
    newClientPhone: optionalString,
    newClientEmail: optionalString,
    newClientBusinessName: optionalString,
    caseId: optionalString,
    title: z.string().trim().min(1, "Title is required"),
    serviceType: z.enum(serviceTypeValues),
    appointmentType: z.enum(appointmentTypeValues),
    startAt: z.string().min(1, "Start time is required"),
    endAt: z.string().min(1, "End time is required"),
    location: optionalString,
    status: z.enum(appointmentStatusValues),
    referralSource: optionalString,
    documentsNeeded: optionalString,
    paymentRequired: z.boolean().optional(),
    paymentStatus: z.enum(paymentStatusValues).optional().or(z.literal("")),
    notes: optionalString,
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    message: "End time must be after start time",
    path: ["endAt"],
  })
  .refine(
    (data) => Boolean(data.clientId) || Boolean(data.newClientFullName?.trim()),
    {
      message: "Select an existing client or enter a name for a new one",
      path: ["clientId"],
    },
  );

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

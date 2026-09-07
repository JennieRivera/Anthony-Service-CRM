import { z } from "zod";
import { serviceTypeValues } from "./client";

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

export const appointmentFormSchema = z
  .object({
    clientId: z.string().min(1, "Client is required"),
    caseId: z.string().optional().or(z.literal("")),
    title: z.string().trim().min(1, "Title is required"),
    serviceType: z.enum(serviceTypeValues),
    startAt: z.string().min(1, "Start time is required"),
    endAt: z.string().min(1, "End time is required"),
    location: z.string().trim().optional().or(z.literal("")),
    status: z.enum(appointmentStatusValues),
    notes: z.string().trim().optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    message: "End time must be after start time",
    path: ["endAt"],
  });

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

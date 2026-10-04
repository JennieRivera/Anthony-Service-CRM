import type { serviceTypeValues } from "@/lib/validation/client";

export type ServiceType = (typeof serviceTypeValues)[number];

// A business-timezone wall-clock range, e.g. { start: "09:00", end: "18:00" }.
export type DayHours = { start: string; end: string } | null;

export type OnlineBookingSettings = {
  enabled: boolean;
  // Indexed by JS weekday: 0 = Sunday … 6 = Saturday.
  weeklyHours: DayHours[];
  slotIntervalMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  maxDaysAhead: number;
};

export type OnlineBookingService = {
  serviceType: ServiceType;
  bookable: boolean;
  durationMinutes: number;
};

// Code-level defaults, used until the owner saves Settings → Online
// booking for the first time (no seed step needed). Values approved by
// the owner on 2026-10-04: Mon–Fri 9–6, Sat 9–1, Sun closed; 2 h minimum
// notice; up to 30 days ahead; 15 min between appointments; 30 min grid.
export const DEFAULT_ONLINE_BOOKING_SETTINGS: OnlineBookingSettings = {
  enabled: true,
  weeklyHours: [
    null,
    { start: "09:00", end: "18:00" },
    { start: "09:00", end: "18:00" },
    { start: "09:00", end: "18:00" },
    { start: "09:00", end: "18:00" },
    { start: "09:00", end: "18:00" },
    { start: "09:00", end: "13:00" },
  ],
  slotIntervalMinutes: 30,
  bufferMinutes: 15,
  minNoticeMinutes: 120,
  maxDaysAhead: 30,
};

// Bookable by default, with each one's appointment length in minutes.
// Every other service type defaults to not bookable.
export const DEFAULT_BOOKABLE_SERVICE_DURATIONS: Partial<Record<ServiceType, number>> = {
  notary: 30,
  document_prep: 30,
  tax_prep: 60,
  immigration: 60,
  company_registration: 45,
  irs_administrative: 30,
};

export const DEFAULT_SERVICE_DURATION_MINUTES = 30;

// Spam limits on successful bookings, counted over a rolling 24 hours.
export const BOOKING_RATE_LIMITS = {
  perPhone: 3,
  perIp: 5,
  windowMinutes: 24 * 60,
} as const;

// Statuses that free a slot back up. Every other status (including
// "requested") blocks it, so a pending online request can't be double-booked.
export const NON_BLOCKING_APPOINTMENT_STATUSES = ["cancelled", "rescheduled"] as const;

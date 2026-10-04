import { and, asc, gt, lt, notInArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  appointments,
  onlineBookingBlockedDates,
  onlineBookingServices,
  onlineBookingSettings,
} from "@/lib/db/schema";
import type { OnlineBookingBlockedDate } from "@/lib/db/schema";
import { serviceTypeValues } from "@/lib/validation/client";
import {
  DEFAULT_BOOKABLE_SERVICE_DURATIONS,
  DEFAULT_ONLINE_BOOKING_SETTINGS,
  DEFAULT_SERVICE_DURATION_MINUTES,
  NON_BLOCKING_APPOINTMENT_STATUSES,
  type OnlineBookingService,
  type OnlineBookingSettings,
} from "@/lib/booking/config";
import type { BusyInterval } from "@/lib/booking/slots";

export type OnlineBookingConfig = {
  settings: OnlineBookingSettings;
  // Every service type, in serviceTypeValues order — saved rows merged
  // over the code-level defaults.
  services: OnlineBookingService[];
  blockedDates: OnlineBookingBlockedDate[];
};

export async function getOnlineBookingConfig(): Promise<OnlineBookingConfig> {
  const db = getDb();
  const [settingsRows, serviceRows, blockedDates] = await Promise.all([
    db.select().from(onlineBookingSettings).limit(1),
    db.select().from(onlineBookingServices),
    db.select().from(onlineBookingBlockedDates).orderBy(asc(onlineBookingBlockedDates.date)),
  ]);

  const saved = settingsRows[0];
  const settings: OnlineBookingSettings = saved
    ? {
        enabled: saved.enabled,
        weeklyHours: saved.weeklyHours,
        slotIntervalMinutes: saved.slotIntervalMinutes,
        bufferMinutes: saved.bufferMinutes,
        minNoticeMinutes: saved.minNoticeMinutes,
        maxDaysAhead: saved.maxDaysAhead,
      }
    : DEFAULT_ONLINE_BOOKING_SETTINGS;

  const savedServices = new Map(serviceRows.map((r) => [r.serviceType, r]));
  const services = serviceTypeValues.map((serviceType): OnlineBookingService => {
    const row = savedServices.get(serviceType);
    if (row) {
      return { serviceType, bookable: row.bookable, durationMinutes: row.durationMinutes };
    }
    const defaultDuration = DEFAULT_BOOKABLE_SERVICE_DURATIONS[serviceType];
    return {
      serviceType,
      bookable: defaultDuration !== undefined,
      durationMinutes: defaultDuration ?? DEFAULT_SERVICE_DURATION_MINUTES,
    };
  });

  return { settings, services, blockedDates };
}

// Start/end instants only — deliberately no client, title, or any other
// column, since this feeds the public availability endpoint.
export async function getBusyIntervals(fromMs: number, toMs: number): Promise<BusyInterval[]> {
  const rows = await getDb()
    .select({ startAt: appointments.startAt, endAt: appointments.endAt })
    .from(appointments)
    .where(
      and(
        lt(appointments.startAt, new Date(toMs)),
        gt(appointments.endAt, new Date(fromMs)),
        notInArray(appointments.status, [...NON_BLOCKING_APPOINTMENT_STATUSES]),
      ),
    );
  return rows.map((r) => ({ startMs: r.startAt.getTime(), endMs: r.endAt.getTime() }));
}

"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  onlineBookingBlockedDates,
  onlineBookingServices,
  onlineBookingSettings,
} from "@/lib/db/schema";
import {
  blockedDateFormSchema,
  onlineBookingSettingsFormSchema,
  type BlockedDateFormValues,
  type OnlineBookingSettingsFormValues,
} from "@/lib/validation/onlineBooking";
import { logAuditEvent } from "@/lib/audit";
import { requireAccessArea } from "@/lib/permissions";

function revalidate() {
  revalidatePath("/settings/online-booking");
  revalidatePath("/book");
}

export async function saveOnlineBookingSettingsAction(
  rawValues: OnlineBookingSettingsFormValues,
) {
  await requireAccessArea("settings");
  const values = onlineBookingSettingsFormSchema.parse(rawValues);
  const db = getDb();
  const now = new Date();

  const settingsRow = {
    enabled: values.enabled,
    weeklyHours: values.weeklyHours.map((d) =>
      d.open ? { start: d.start, end: d.end } : null,
    ),
    slotIntervalMinutes: values.slotIntervalMinutes,
    bufferMinutes: values.bufferMinutes,
    minNoticeMinutes: values.minNoticeMinutes,
    maxDaysAhead: values.maxDaysAhead,
    updatedAt: now,
  };

  await db
    .insert(onlineBookingSettings)
    .values({ id: "default", ...settingsRow })
    .onConflictDoUpdate({ target: onlineBookingSettings.id, set: settingsRow });

  if (values.services.length > 0) {
    await db
      .insert(onlineBookingServices)
      .values(values.services.map((s) => ({ ...s, updatedAt: now })))
      .onConflictDoUpdate({
        target: onlineBookingServices.serviceType,
        set: {
          bookable: sql`excluded.bookable`,
          durationMinutes: sql`excluded.duration_minutes`,
          updatedAt: now,
        },
      });
  }

  await logAuditEvent({
    action: "online_booking.settings_updated",
    entityType: "online_booking_settings",
    entityId: "default",
    summary: `Online booking ${values.enabled ? "enabled" : "disabled"}; bookable: ${
      values.services.filter((s) => s.bookable).map((s) => s.serviceType).join(", ") || "none"
    }`,
  });

  revalidate();
}

export async function addOnlineBookingBlockedDateAction(rawValues: BlockedDateFormValues) {
  await requireAccessArea("settings");
  const values = blockedDateFormSchema.parse(rawValues);

  await getDb()
    .insert(onlineBookingBlockedDates)
    .values({ date: values.date, reason: values.reason || null })
    .onConflictDoUpdate({
      target: onlineBookingBlockedDates.date,
      set: { reason: values.reason || null },
    });

  await logAuditEvent({
    action: "online_booking.date_blocked",
    entityType: "online_booking_blocked_date",
    entityId: values.date,
    summary: `Blocked online booking on ${values.date}${values.reason ? ` (${values.reason})` : ""}`,
  });

  revalidate();
}

export async function removeOnlineBookingBlockedDateAction(id: string) {
  await requireAccessArea("settings");

  const [removed] = await getDb()
    .delete(onlineBookingBlockedDates)
    .where(eq(onlineBookingBlockedDates.id, id))
    .returning({ date: onlineBookingBlockedDates.date });

  if (removed) {
    await logAuditEvent({
      action: "online_booking.date_unblocked",
      entityType: "online_booking_blocked_date",
      entityId: removed.date,
      summary: `Unblocked online booking on ${removed.date}`,
    });
  }

  revalidate();
}

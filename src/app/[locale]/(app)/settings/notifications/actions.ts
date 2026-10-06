"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { notificationSettings, notificationTexts } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { requireAccessArea } from "@/lib/permissions";
import {
  notificationSettingsFormSchema,
  notificationTextFormSchema,
  type NotificationSettingsFormValues,
  type NotificationTextFormValues,
} from "@/lib/validation/notifications";
import { formatUsPhone, usPhoneDigits } from "@/lib/validation/onlineBooking";
import { getNotificationSettings, renderEmail } from "@/lib/notifications/engine";
import { usPhoneE164 } from "@/lib/notifications/config";
import { renderSms } from "@/lib/notifications/texts";
import { realSenders, smsSetupStatus } from "@/lib/notifications/providers";
import { getLegalTexts, pickLocale } from "@/lib/legal/texts";
import type { PortalDb } from "@/lib/portal/db";

// Settings → Automatic notices (Step 3B). Admin only.

const revalidate = () => revalidatePath("/settings/notifications");

export async function saveNotificationSettingsAction(rawValues: NotificationSettingsFormValues) {
  await requireAccessArea("settings");
  const values = notificationSettingsFormSchema.parse(rawValues);
  const updatedByEmail = (await auth())?.user?.email ?? null;
  const row = {
    enabled: values.enabled,
    testMode: values.testMode,
    testEmail: values.testEmail || null,
    testPhone: values.testPhone ? formatUsPhone(usPhoneDigits(values.testPhone)!) : null,
    ownerAlertEmail: values.ownerAlertEmail || null,
    preciseReminders: values.preciseReminders,
    types: values.types,
    updatedAt: new Date(),
    updatedByEmail,
  };
  await getDb()
    .insert(notificationSettings)
    .values({ id: "default", ...row })
    .onConflictDoUpdate({ target: notificationSettings.id, set: row });
  await logAuditEvent({
    action: "notices.settings_updated",
    entityType: "notification_settings",
    entityId: "default",
    summary: `Automatic notices: ${values.enabled ? "ON" : "OFF"}, test mode ${values.testMode ? "ON" : "OFF"}, precise reminders ${values.preciseReminders ? "ON" : "OFF"}, types off: ${
      Object.entries(values.types)
        .filter(([, on]) => !on)
        .map(([t]) => t)
        .join(", ") || "none"
    }`,
  });
  revalidate();
}

export async function saveNotificationTextAction(rawValues: NotificationTextFormValues) {
  await requireAccessArea("settings");
  const v = notificationTextFormSchema.parse(rawValues);
  const updatedByEmail = (await auth())?.user?.email ?? null;
  const row = { subject: v.channel === "email" ? v.subject || null : null, body: v.body, updatedAt: new Date(), updatedByEmail };
  await getDb()
    .insert(notificationTexts)
    .values({ type: v.type, channel: v.channel, language: v.language, ...row })
    .onConflictDoUpdate({
      target: [notificationTexts.type, notificationTexts.channel, notificationTexts.language],
      set: row,
    });
  await logAuditEvent({
    action: "notices.text_updated",
    entityType: "notification_texts",
    entityId: `${v.type}:${v.channel}:${v.language}`,
    summary: `Automatic notice text updated: ${v.type} (${v.channel}, ${v.language})`,
  });
  revalidate();
}

// "Restore the original text": removes the saved row so the default applies.
export async function resetNotificationTextAction(raw: { type: string; channel: string; language: string }) {
  await requireAccessArea("settings");
  const v = notificationTextFormSchema.pick({ type: true, channel: true, language: true }).parse(raw);
  await getDb()
    .delete(notificationTexts)
    .where(
      and(
        eq(notificationTexts.type, v.type),
        eq(notificationTexts.channel, v.channel),
        eq(notificationTexts.language, v.language),
      ),
    );
  await logAuditEvent({
    action: "notices.text_reset",
    entityType: "notification_texts",
    entityId: `${v.type}:${v.channel}:${v.language}`,
    summary: `Automatic notice text restored to default: ${v.type} (${v.channel}, ${v.language})`,
  });
  revalidate();
}

export type TestNoticeResult = { ok: true } | { ok: false; error: string };

// Sends a sample message ONLY to the owner's own test phone / email
// (never to a client), so the owner can check each channel works.
export async function sendTestNoticeAction(channel: "sms" | "email", language: "en" | "es"): Promise<TestNoticeResult> {
  await requireAccessArea("settings");
  const db = getDb() as unknown as PortalDb;
  const settings = await getNotificationSettings(db);
  const lang = language === "en" ? "en" : "es";
  const sample =
    lang === "es"
      ? "Este es un mensaje de prueba de los avisos automáticos del CRM."
      : "This is a test message from the CRM's automatic notices.";

  if (channel === "sms") {
    // The reason is shown to the owner: e.g. "SMS stay off until Twilio
    // approves the verification (TWILIO_SMS_ENABLED missing)".
    const setup = smsSetupStatus();
    if (setup !== "ready") return { ok: false, error: `sms_${setup}` };
    const to = usPhoneE164(settings.testPhone);
    if (!to) return { ok: false, error: "test_phone_missing" };
    const result = await realSenders.sms({ to, body: renderSms(sample, lang, {}) });
    await logAuditEvent({
      action: "notices.test_sent",
      entityType: "notification_settings",
      entityId: "default",
      summary: `Test SMS to the owner's test phone: ${result.ok ? "sent" : `failed (${result.error})`}`,
    });
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }

  if (!realSenders.configured("email")) return { ok: false, error: "email_not_configured" };
  const to = settings.testEmail.trim();
  if (!to) return { ok: false, error: "test_email_missing" };
  const notALawFirm = pickLocale((await getLegalTexts(db)).not_a_law_firm_email, lang);
  const { html, text } = renderEmail(sample, lang, notALawFirm, "client");
  const result = await realSenders.email({
    to,
    subject: lang === "es" ? "[PRUEBA] Avisos automáticos" : "[TEST] Automatic notices",
    html,
    text,
  });
  await logAuditEvent({
    action: "notices.test_sent",
    entityType: "notification_settings",
    entityId: "default",
    summary: `Test email to the owner's test address: ${result.ok ? "sent" : `failed (${result.error})`}`,
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

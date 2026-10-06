import { and, asc, eq, gt, inArray, lte, or, sql } from "drizzle-orm";
import {
  appointments,
  clientCommunicationPreferences,
  clients,
  conversationMessages,
  notificationOutbox,
  notificationSettings,
  notificationTexts,
  tasks,
} from "@/lib/db/schema";
import { BUSINESS_TIME_ZONE, businessDateString } from "@/lib/dates";
import { businessInfo } from "@/lib/business-info";
import { getLegalTexts, pickLocale } from "@/lib/legal/texts";
import type { PortalDb } from "@/lib/portal/db";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTICE_TYPES,
  NOTICE_LABELS_EN,
  chooseChannel,
  usableChannels,
  isWithinSmsHours,
  nextSmsSendTime,
  usPhoneE164,
  looksLikeEmail,
  SMS_BLOCKED_STATUSES,
  EMAIL_BLOCKED_STATUSES,
  type Channel,
  type ClientNoticeType,
  type NoticeType,
  type NotificationSettings,
  type OwnerNoticeType,
} from "./config";
import {
  DEFAULT_NOTICE_TEXTS,
  fill,
  noticeDate,
  noticeTime,
  renderSms,
  type NoticeText,
  type NoticeTextKey,
} from "./texts";
import type { Senders } from "./providers";

// Automatic notices (Step 3B): queue, rules, and delivery. No Next.js
// imports — the database and the senders are passed in, so tests run this
// exact code on PGlite with fake senders (nothing is ever really sent).

export type NoticeDeps = {
  senders: Senders;
  // e.g. "https://anthony-service-crm.vercel.app" — for portal / CRM links.
  baseUrl: string;
  ownerFallbackEmail?: string | null;
  now?: Date;
};

const OWNER_LANGUAGE = "es" as const;
const MAX_ATTEMPTS = 3;
const LINK_PLACEHOLDER = "[link]";

// ── settings & texts ─────────────────────────────────────────────────

export async function getNotificationSettings(db: PortalDb): Promise<NotificationSettings> {
  const [row] = await db.select().from(notificationSettings).limit(1);
  if (!row) return DEFAULT_NOTIFICATION_SETTINGS;
  return {
    enabled: row.enabled,
    testMode: row.testMode,
    testEmail: row.testEmail ?? "",
    testPhone: row.testPhone ?? "",
    ownerAlertEmail: row.ownerAlertEmail ?? "",
    types: Object.fromEntries(
      NOTICE_TYPES.map((t) => [t, row.types?.[t] ?? DEFAULT_NOTIFICATION_SETTINGS.types[t]]),
    ) as Record<NoticeType, boolean>,
    preciseReminders: row.preciseReminders,
  };
}

export async function getNoticeText(
  db: PortalDb,
  type: NoticeType,
  channel: Channel,
  language: "en" | "es",
): Promise<NoticeText | null> {
  const [row] = await db
    .select({ subject: notificationTexts.subject, body: notificationTexts.body })
    .from(notificationTexts)
    .where(
      and(
        eq(notificationTexts.type, type),
        eq(notificationTexts.channel, channel),
        eq(notificationTexts.language, language),
      ),
    )
    .limit(1);
  if (row && row.body.trim()) return { subject: row.subject ?? undefined, body: row.body };
  return DEFAULT_NOTICE_TEXTS[`${type}:${channel}:${language}` as NoticeTextKey] ?? null;
}

// ── rendering ────────────────────────────────────────────────────────

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const EMAIL_FOOTER = {
  es: (phone: string) =>
    `Este es un aviso automático de Anthony Multiservice. Para cambiar cómo le contactamos, use "Mis autorizaciones" en su portal o llámenos al ${phone}.`,
  en: (phone: string) =>
    `This is an automatic notice from Anthony Multiservice. To change how we contact you, use "My authorizations" in your portal or call us at ${phone}.`,
};

// notALawFirm: the SHORT email version (legal text "not_a_law_firm_email").
// Client emails end with a signature (name + phone), then the "automatic
// notice" line and the legal line in small gray type.
export function renderEmail(
  body: string,
  language: "en" | "es",
  notALawFirm: string,
  audience: "client" | "owner",
): { html: string; text: string } {
  const signature = [
    businessInfo.name.replace(/, LLC$/, ""),
    `${language === "es" ? "Tel." : "Phone"} ${businessInfo.phone}`,
  ];
  const footer = audience === "client" ? [EMAIL_FOOTER[language](businessInfo.phone), notALawFirm].filter(Boolean) : [];
  const text = [
    body,
    ...(audience === "client" ? [signature.join("\n")] : []),
    ...footer.map((f) => `—\n${f}`),
  ].join("\n\n");
  const linkify = (s: string) =>
    escapeHtml(s).replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#1f5c4c">${url}</a>`);
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${linkify(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const sign =
    audience === "client"
      ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.4">${signature.map(escapeHtml).join("<br>")}</p>`
      : "";
  const foot = footer
    .map((f) => `<p style="margin:0 0 6px;color:#6b7a75;font-size:11px;line-height:1.4">${escapeHtml(f)}</p>`)
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f8f6;font-family:Arial,Helvetica,sans-serif;color:#17332c">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#1f5c4c">Anthony Multiservice</p>
<div style="background:#ffffff;border-radius:10px;padding:20px;font-size:15px;line-height:1.5">${paragraphs}${sign}</div>
<div style="padding:16px 4px 0">${foot}</div>
</div></body></html>`;
  return { html, text };
}

// ── delivery ─────────────────────────────────────────────────────────

type OutboxRow = typeof notificationOutbox.$inferSelect;

// Claims one queued row (single conditional UPDATE — two runs can never
// both send it), sends it, records the result, and logs it in
// Communications + audit. `secretBody` replaces the stored body for this
// one send (the portal-link notice: the stored copy has "[link]").
export async function dispatchNotice(
  db: PortalDb,
  id: string,
  deps: NoticeDeps,
  secret?: { body: string; html?: string; text?: string },
): Promise<"sent" | "failed" | "not_due"> {
  const now = deps.now ?? new Date();
  const [row] = await db
    .update(notificationOutbox)
    .set({ status: "sending", attempts: sql`${notificationOutbox.attempts} + 1` })
    .where(
      and(
        eq(notificationOutbox.id, id),
        or(
          inArray(notificationOutbox.status, ["pending", "scheduled"]),
          and(eq(notificationOutbox.status, "failed"), sql`${notificationOutbox.attempts} < ${MAX_ATTEMPTS}`),
        ),
        lte(notificationOutbox.sendAfter, now),
      ),
    )
    .returning();
  if (!row || row.channel === "none" || !row.recipient || !row.body) return "not_due";

  // SMS never goes out at night, even on a retry or a late run.
  if (row.channel === "sms" && !isWithinSmsHours(now)) {
    await db
      .update(notificationOutbox)
      .set({ status: "scheduled", sendAfter: nextSmsSendTime(now), attempts: sql`${notificationOutbox.attempts} - 1` })
      .where(eq(notificationOutbox.id, row.id));
    return "not_due";
  }

  let result;
  if (row.channel === "sms") {
    result = await deps.senders.sms({ to: row.recipient, body: secret?.body ?? row.body });
  } else {
    const notALawFirm =
      row.audience === "client" ? pickLocale((await getLegalTexts(db)).not_a_law_firm_email, row.language) : "";
    const rendered = renderEmail(secret?.body ?? row.body, row.language, notALawFirm, row.audience);
    result = await deps.senders.email({
      to: row.recipient,
      subject: row.subject ?? "Anthony Multiservice",
      html: rendered.html,
      text: rendered.text,
    });
  }

  if (result.ok) {
    await db
      .update(notificationOutbox)
      .set({ status: "sent", sentAt: now, providerMessageId: result.id, error: null })
      .where(eq(notificationOutbox.id, row.id));
  } else {
    await db.update(notificationOutbox).set({ status: "failed", error: result.error }).where(eq(notificationOutbox.id, row.id));
  }
  await logToCommunications(db, row, result.ok ? null : result.error, now);
  return result.ok ? "sent" : "failed";
}

// Every client notice (sent or failed) appears in Communications and on
// the client record. Test-mode sends went to the owner, not the client,
// so they stay in the outbox log only.
async function logToCommunications(db: PortalDb, row: OutboxRow, error: string | null, now: Date) {
  if (row.audience !== "client" || !row.clientId || row.testMode || row.channel === "none") return;
  const label = NOTICE_LABELS_EN[row.type as NoticeType] ?? row.type;
  await db.insert(conversationMessages).values({
    occurredAt: now,
    clientId: row.clientId,
    caseId: row.caseId,
    appointmentId: row.appointmentId,
    channel: row.channel,
    direction: "outbound",
    subject: row.subject,
    summary: error ? `Automatic notice FAILED: ${label} (${error.slice(0, 120)})` : `Automatic notice: ${label}`,
    fullMessage: row.body,
    counterpart: row.recipient,
    status: "completed",
    createdByEmail: "system:automatic-notices",
  });
  if (!error) {
    const patch =
      row.channel === "sms"
        ? { lastSmsSentAt: now }
        : { lastEmailSentAt: now, lastEmailSubject: row.subject };
    await db
      .insert(clientCommunicationPreferences)
      .values({ clientId: row.clientId, ...patch, updatedAt: now })
      .onConflictDoUpdate({ target: clientCommunicationPreferences.clientId, set: { ...patch, updatedAt: now } });
  }
}


// ── client notices ───────────────────────────────────────────────────

export type NoticeResult =
  | { status: "disabled" | "duplicate" | "no_client" }
  | { status: "no_channel" }
  | { status: "skipped"; reason: string }
  | { status: "scheduled" | "sent" | "failed"; channel: Channel; outboxId: string };

export async function notifyClient(
  db: PortalDb,
  input: {
    type: ClientNoticeType;
    clientId: string;
    dedupeKey: string;
    appointmentId?: string | null;
    caseId?: string | null;
    vars?: Record<string, string>;
    // Only for the portal-link notice: the real link (with its token) is
    // sent but never stored; the outbox keeps "[link]".
    secretLink?: string;
    // Restrict to one channel (staff picked it, e.g. "send link by email").
    onlyChannel?: Channel;
  },
  deps: NoticeDeps,
): Promise<NoticeResult> {
  const now = deps.now ?? new Date();
  const settings = await getNotificationSettings(db);
  if (!settings.enabled || !settings.types[input.type]) return { status: "disabled" };

  const [client] = await db
    .select({
      fullName: clients.fullName,
      email: clients.email,
      phone: clients.phone,
      language: clients.preferredLanguage,
      preferredChannel: clientCommunicationPreferences.preferredChannel,
      smsConsent: clientCommunicationPreferences.smsConsent,
      emailConsent: clientCommunicationPreferences.emailConsent,
      smsStatus: clientCommunicationPreferences.smsStatus,
      emailStatus: clientCommunicationPreferences.emailStatus,
    })
    .from(clients)
    .leftJoin(clientCommunicationPreferences, eq(clientCommunicationPreferences.clientId, clients.id))
    .where(eq(clients.id, input.clientId))
    .limit(1);
  if (!client) return { status: "no_client" };

  const facts = {
    preferredChannel: client.preferredChannel ?? null,
    smsConsent: client.smsConsent ?? false,
    emailConsent: client.emailConsent ?? false,
    smsStatus: client.smsStatus ?? null,
    emailStatus: client.emailStatus ?? null,
    phone: client.phone,
    email: client.email,
  };
  // A channel whose provider isn't connected yet counts as unavailable,
  // so the next authorized one is used instead.
  const channel = chooseChannel({
    ...facts,
    smsConsent: facts.smsConsent && deps.senders.configured("sms") && (!input.onlyChannel || input.onlyChannel === "sms"),
    emailConsent: facts.emailConsent && deps.senders.configured("email") && (!input.onlyChannel || input.onlyChannel === "email"),
  });
  const language = client.language;

  if (!channel) {
    const [row] = await db
      .insert(notificationOutbox)
      .values({
        dedupeKey: input.dedupeKey,
        type: input.type,
        audience: "client",
        clientId: input.clientId,
        appointmentId: input.appointmentId ?? null,
        caseId: input.caseId ?? null,
        channel: "none",
        language,
        status: "skipped",
        error: "no_authorized_channel",
        createdAt: now,
      })
      .onConflictDoNothing({ target: notificationOutbox.dedupeKey })
      .returning({ id: notificationOutbox.id });
    if (!row) return { status: "duplicate" };
    // Staff asked for this one (portal link) and see the result on screen.
    if (input.type !== "portal_link") {
      await db.insert(tasks).values({
        clientId: input.clientId,
        caseId: input.caseId ?? null,
        appointmentId: input.appointmentId ?? null,
        type: "call_client",
        title: `Call client (no authorized channel for an automatic notice): ${NOTICE_LABELS_EN[input.type]}`,
        createdAt: now,
      });
    }
    return { status: "no_channel" };
  }

  // Test mode: the notice goes to the owner's own phone/email instead.
  const testRecipient = channel === "sms" ? usPhoneE164(settings.testPhone) : settings.testEmail.trim() || null;
  const recipient = settings.testMode ? testRecipient : channel === "sms" ? usPhoneE164(client.phone) : client.email;
  if (!recipient) {
    await db
      .insert(notificationOutbox)
      .values({
        dedupeKey: input.dedupeKey,
        type: input.type,
        audience: "client",
        clientId: input.clientId,
        channel,
        language,
        status: "skipped",
        error: settings.testMode ? "test_contact_missing" : "recipient_missing",
        testMode: settings.testMode,
        createdAt: now,
      })
      .onConflictDoNothing({ target: notificationOutbox.dedupeKey });
    return { status: "skipped", reason: settings.testMode ? "test_contact_missing" : "recipient_missing" };
  }

  const text = await getNoticeText(db, input.type, channel, language);
  if (!text) return { status: "skipped", reason: "no_text" };
  const vars = {
    name: client.fullName.trim().split(/\s+/)[0] ?? "",
    phone: businessInfo.phone,
    link: `${deps.baseUrl}/${language}/portal`,
    ...input.vars,
  };
  const storedVars = input.secretLink ? { ...vars, link: LINK_PLACEHOLDER } : vars;
  const sendVars = input.secretLink ? { ...vars, link: input.secretLink } : vars;
  const render = (v: Record<string, string>) =>
    channel === "sms" ? renderSms(text.body, language, v) : fill(text.body, v);
  const testPrefix = settings.testMode ? `[PRUEBA → ${client.fullName}] ` : "";
  const subject = text.subject ? `${testPrefix}${fill(text.subject, vars)}` : null;
  const storedBody = `${channel === "sms" ? testPrefix : ""}${render(storedVars)}`;

  const sendAfter = channel === "sms" ? nextSmsSendTime(now) : now;
  const deferred = sendAfter > now;
  // A portal link (with its token) is never stored, so it can't wait for
  // the morning: staff are told to send it by email or during the day.
  if (deferred && input.secretLink) return { status: "skipped", reason: "outside_sms_hours" };

  const [row] = await db
    .insert(notificationOutbox)
    .values({
      dedupeKey: input.dedupeKey,
      type: input.type,
      audience: "client",
      clientId: input.clientId,
      appointmentId: input.appointmentId ?? null,
      caseId: input.caseId ?? null,
      channel,
      recipient,
      language,
      subject,
      body: storedBody,
      status: deferred ? "scheduled" : "pending",
      sendAfter,
      testMode: settings.testMode,
      createdAt: now,
    })
    .onConflictDoNothing({ target: notificationOutbox.dedupeKey })
    .returning({ id: notificationOutbox.id });
  if (!row) return { status: "duplicate" };
  if (deferred) return { status: "scheduled", channel, outboxId: row.id };

  const secret = input.secretLink ? { body: `${channel === "sms" ? testPrefix : ""}${render(sendVars)}` } : undefined;
  const outcome = await dispatchNotice(db, row.id, { ...deps, now }, secret);
  return { status: outcome === "sent" ? "sent" : "failed", channel, outboxId: row.id };
}

// ── owner alerts (email to the owner; no client consent involved) ────

export async function notifyOwner(
  db: PortalDb,
  input: { type: OwnerNoticeType; dedupeKey: string; clientId?: string | null; vars: Record<string, string> },
  deps: NoticeDeps,
): Promise<NoticeResult> {
  const now = deps.now ?? new Date();
  const settings = await getNotificationSettings(db);
  if (!settings.enabled || !settings.types[input.type]) return { status: "disabled" };
  const to = settings.ownerAlertEmail.trim() || deps.ownerFallbackEmail?.trim() || "";
  if (!to || !deps.senders.configured("email")) return { status: "skipped", reason: "email_not_ready" };
  const text = await getNoticeText(db, input.type, "email", OWNER_LANGUAGE);
  if (!text) return { status: "skipped", reason: "no_text" };

  const [row] = await db
    .insert(notificationOutbox)
    .values({
      dedupeKey: input.dedupeKey,
      type: input.type,
      audience: "owner",
      clientId: input.clientId ?? null,
      channel: "email",
      recipient: to,
      language: OWNER_LANGUAGE,
      subject: fill(text.subject ?? "Anthony Multiservice", input.vars),
      body: fill(text.body, input.vars),
      status: "pending",
      sendAfter: now,
      createdAt: now,
    })
    .onConflictDoNothing({ target: notificationOutbox.dedupeKey })
    .returning({ id: notificationOutbox.id });
  if (!row) return { status: "duplicate" };
  const outcome = await dispatchNotice(db, row.id, { ...deps, now });
  return { status: outcome === "sent" ? "sent" : "failed", channel: "email", outboxId: row.id };
}

// ── the scheduled run ────────────────────────────────────────────────

const REMINDER_STATUSES = ["scheduled", "confirmed"] as const;
const HOUR_MS = 60 * 60 * 1000;
const RECENT_CONFIRMATION_MS = 4 * HOUR_MS;

const floridaHourOf = (d: Date) =>
  Number(new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(d));

export function appointmentNoticeVars(startAt: Date, language: "en" | "es") {
  return { date: noticeDate(startAt, language), time: noticeTime(startAt) };
}

// Queues the reminders that are due now. Precise reminders (default; the
// run is every 15 minutes on Vercel Pro): 24 h before and 2 h before.
// Fallback with one daily run: every confirmed appointment on tomorrow's
// Florida date. Both modes
// use the same dedupe key for the main reminder, so switching modes never
// sends it twice.
export async function queueDueReminders(db: PortalDb, deps: NoticeDeps): Promise<number> {
  const now = deps.now ?? new Date();
  const settings = await getNotificationSettings(db);
  if (!settings.enabled) return 0;

  type Due = { id: string; clientId: string; caseId: string | null; startAt: Date; kind: "24h" | "2h" };
  const due: Due[] = [];
  const upcoming = await db
    .select({
      id: appointments.id,
      clientId: appointments.clientId,
      caseId: appointments.caseId,
      startAt: appointments.startAt,
      language: clients.preferredLanguage,
    })
    .from(appointments)
    .innerJoin(clients, eq(clients.id, appointments.clientId))
    .where(
      and(
        inArray(appointments.status, [...REMINDER_STATUSES]),
        gt(appointments.startAt, now),
        lte(appointments.startAt, new Date(now.getTime() + 48 * HOUR_MS)),
      ),
    )
    .orderBy(asc(appointments.startAt));

  // A client who was just told "your appointment is confirmed" doesn't
  // also need a reminder minutes later.
  const recentlyConfirmed = new Set(
    upcoming.length === 0
      ? []
      : (
          await db
            .select({ appointmentId: notificationOutbox.appointmentId })
            .from(notificationOutbox)
            .where(
              and(
                eq(notificationOutbox.type, "appointment_confirmed"),
                gt(notificationOutbox.createdAt, new Date(now.getTime() - RECENT_CONFIRMATION_MS)),
                inArray(notificationOutbox.appointmentId, upcoming.map((u) => u.id)),
              ),
            )
        ).map((r) => r.appointmentId),
  );

  const tomorrow = businessDateString(new Date(now.getTime() + 24 * HOUR_MS));
  for (const a of upcoming) {
    const msAhead = a.startAt.getTime() - now.getTime();
    if (settings.preciseReminders) {
      // Runs every 15 minutes (vercel.json), so each window is always hit:
      // 24 h reminder between 24 h and 20 h before, 2 h reminder between
      // 2 h and 1 h before. An appointment confirmed later than a window
      // simply skips that reminder.
      if (recentlyConfirmed.has(a.id)) continue;
      if (msAhead <= 24 * HOUR_MS && msAhead > 20 * HOUR_MS) due.push({ ...a, kind: "24h" });
      if (msAhead <= 2 * HOUR_MS && msAhead > 1 * HOUR_MS) due.push({ ...a, kind: "2h" });
    } else if (businessDateString(a.startAt) === tomorrow && floridaHourOf(now) >= 9) {
      due.push({ ...a, kind: "24h" });
    }
  }

  let queued = 0;
  for (const a of due) {
    const type = a.kind === "24h" ? "appointment_reminder_24h" : "appointment_reminder_2h";
    if (!settings.types[type]) continue;
    const language = upcoming.find((u) => u.id === a.id)?.language ?? "en";
    const res = await notifyClient(
      db,
      {
        type,
        clientId: a.clientId,
        appointmentId: a.id,
        caseId: a.caseId,
        dedupeKey: `${type}:${a.id}:${a.startAt.toISOString()}`,
        vars: appointmentNoticeVars(a.startAt, language),
      },
      deps,
    );
    if (res.status !== "duplicate" && res.status !== "disabled") queued++;
  }
  return queued;
}

// Sends everything queued whose time has come (night-time SMS held for
// the morning, and failed sends still under the retry limit).
export async function dispatchDueNotices(db: PortalDb, deps: NoticeDeps, limit = 100): Promise<number> {
  const now = deps.now ?? new Date();
  const rows = await db
    .select({ id: notificationOutbox.id })
    .from(notificationOutbox)
    .where(
      and(
        lte(notificationOutbox.sendAfter, now),
        or(
          inArray(notificationOutbox.status, ["pending", "scheduled"]),
          and(eq(notificationOutbox.status, "failed"), sql`${notificationOutbox.attempts} < ${MAX_ATTEMPTS}`),
        ),
      ),
    )
    .orderBy(asc(notificationOutbox.sendAfter))
    .limit(limit);
  let sent = 0;
  for (const r of rows) if ((await dispatchNotice(db, r.id, { ...deps, now })) === "sent") sent++;
  return sent;
}

// ── STOP replies ─────────────────────────────────────────────────────

// Withdraws SMS consent for every client with this phone number and
// records it in the append-only history. Returns how many were updated.
export async function applySmsStop(
  db: PortalDb,
  params: { fromPhone: string; text: string; now?: Date },
  record: (clientId: string) => Promise<void>,
): Promise<number> {
  const now = params.now ?? new Date();
  const e164 = usPhoneE164(params.fromPhone);
  if (!e164) return 0;
  const digits = e164.slice(2);
  const matches = await db
    .select({ id: clients.id })
    .from(clients)
    .where(sql`right(regexp_replace(coalesce(${clients.phone}, ''), '\\D', '', 'g'), 10) = ${digits}`);
  for (const m of matches) {
    const patch = { smsConsent: false, smsStatus: "opted_out" as const, optOutDate: businessDateString(now), updatedAt: now };
    await db
      .insert(clientCommunicationPreferences)
      .values({ clientId: m.id, ...patch })
      .onConflictDoUpdate({ target: clientCommunicationPreferences.clientId, set: patch });
    await record(m.id);
    await db.insert(conversationMessages).values({
      occurredAt: now,
      clientId: m.id,
      channel: "sms",
      direction: "inbound",
      summary: "Client replied STOP — SMS authorization withdrawn",
      fullMessage: params.text.slice(0, 160),
      counterpart: e164,
      status: "completed",
      createdByEmail: "system:automatic-notices",
    });
  }
  return matches.length;
}

// ── triggers used by the CRM ─────────────────────────────────────────

// Staff moved an appointment from "Requested" to "Scheduled"/"Confirmed".
export async function notifyAppointmentConfirmed(db: PortalDb, appointmentId: string, deps: NoticeDeps) {
  const [a] = await db
    .select({
      clientId: appointments.clientId,
      caseId: appointments.caseId,
      startAt: appointments.startAt,
      language: clients.preferredLanguage,
    })
    .from(appointments)
    .innerJoin(clients, eq(clients.id, appointments.clientId))
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  if (!a || a.startAt <= (deps.now ?? new Date())) return { status: "no_client" } as NoticeResult;
  return notifyClient(
    db,
    {
      type: "appointment_confirmed",
      clientId: a.clientId,
      appointmentId,
      caseId: a.caseId,
      dedupeKey: `appointment_confirmed:${appointmentId}:${a.startAt.toISOString()}`,
      vars: appointmentNoticeVars(a.startAt, a.language),
    },
    deps,
  );
}

// Short, stable fingerprint of a text (so the dedupe key changes only when
// the requested-documents text really changes).
function fingerprint(text: string): string {
  let h = 0;
  for (const ch of text.trim()) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
}

// A case's status changed (except to "Cancelled", which staff tell the
// client themselves) or its requested documents changed. The notice only
// says "you have an update in your portal" — never what changed.
export async function notifyCaseUpdate(
  db: PortalDb,
  input: { caseId: string; clientId: string; status: string; documentsRequested: string | null },
  deps: NoticeDeps,
) {
  if (input.status === "cancelled") return { status: "disabled" } as NoticeResult;
  const day = businessDateString(deps.now ?? new Date());
  return notifyClient(
    db,
    {
      type: "case_update",
      clientId: input.clientId,
      caseId: input.caseId,
      dedupeKey: `case_update:${input.caseId}:${input.status}:${fingerprint(input.documentsRequested ?? "")}:${day}`,
    },
    deps,
  );
}

// ── owner alert helpers ──────────────────────────────────────────────
// Client name + date/time + a CRM link only: no service details, even in
// the owner's own inbox.
async function clientName(db: PortalDb, clientId: string) {
  const [c] = await db.select({ fullName: clients.fullName }).from(clients).where(eq(clients.id, clientId)).limit(1);
  return c?.fullName ?? "";
}

export async function notifyOwnerNewBooking(
  db: PortalDb,
  input: { appointmentId: string; clientId: string; startAt: Date },
  deps: NoticeDeps,
) {
  return notifyOwner(
    db,
    {
      type: "owner_new_booking",
      dedupeKey: `owner_new_booking:${input.appointmentId}`,
      clientId: input.clientId,
      vars: {
        client: await clientName(db, input.clientId),
        ...appointmentNoticeVars(input.startAt, "es"),
        link: `${deps.baseUrl}/es/appointments/${input.appointmentId}`,
      },
    },
    deps,
  );
}

export async function notifyOwnerDocumentUploaded(
  db: PortalDb,
  input: { documentId: string; clientId: string },
  deps: NoticeDeps,
) {
  return notifyOwner(
    db,
    {
      type: "owner_document_uploaded",
      dedupeKey: `owner_document_uploaded:${input.documentId}`,
      clientId: input.clientId,
      vars: { client: await clientName(db, input.clientId), link: `${deps.baseUrl}/es/clients/${input.clientId}` },
    },
    deps,
  );
}

export async function notifyOwnerChangeRequest(
  db: PortalDb,
  input: { appointmentId: string; clientId: string; kind: "cancel" | "reschedule" },
  deps: NoticeDeps,
) {
  const [a] = await db
    .select({ startAt: appointments.startAt })
    .from(appointments)
    .where(and(eq(appointments.id, input.appointmentId), eq(appointments.clientId, input.clientId)))
    .limit(1);
  if (!a) return { status: "no_client" } as NoticeResult;
  return notifyOwner(
    db,
    {
      type: "owner_change_request",
      dedupeKey: `owner_change_request:${input.appointmentId}:${input.kind}:${businessDateString(deps.now ?? new Date())}`,
      clientId: input.clientId,
      vars: {
        client: await clientName(db, input.clientId),
        kind: input.kind === "cancel" ? "cancelar" : "cambiar",
        ...appointmentNoticeVars(a.startAt, "es"),
        link: `${deps.baseUrl}/es/tasks`,
      },
    },
    deps,
  );
}

// For the "Send portal link" buttons: which channels can be used for this
// client right now (authorized, contact data present, provider connected).
export async function availableChannelsForClient(db: PortalDb, clientId: string, deps: NoticeDeps): Promise<Channel[]> {
  const [c] = await db
    .select({
      email: clients.email,
      phone: clients.phone,
      smsConsent: clientCommunicationPreferences.smsConsent,
      emailConsent: clientCommunicationPreferences.emailConsent,
      smsStatus: clientCommunicationPreferences.smsStatus,
      emailStatus: clientCommunicationPreferences.emailStatus,
    })
    .from(clients)
    .leftJoin(clientCommunicationPreferences, eq(clientCommunicationPreferences.clientId, clients.id))
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!c) return [];
  return usableChannels({
    preferredChannel: null,
    smsConsent: (c.smsConsent ?? false) && deps.senders.configured("sms"),
    emailConsent: (c.emailConsent ?? false) && deps.senders.configured("email"),
    smsStatus: c.smsStatus ?? null,
    emailStatus: c.emailStatus ?? null,
    phone: c.phone,
    email: c.email,
  });
}

// Why a "Send portal link" button is off, so staff sees a reason instead of
// a dead button. null = the channel can be used.
export type SendBlockReason = "provider_off" | "no_contact" | "no_consent" | "blocked";

export async function portalLinkSendBlocks(
  db: PortalDb,
  clientId: string,
  deps: NoticeDeps,
): Promise<Record<Channel, SendBlockReason | null>> {
  const [c] = await db
    .select({
      email: clients.email,
      phone: clients.phone,
      smsConsent: clientCommunicationPreferences.smsConsent,
      emailConsent: clientCommunicationPreferences.emailConsent,
      smsStatus: clientCommunicationPreferences.smsStatus,
      emailStatus: clientCommunicationPreferences.emailStatus,
    })
    .from(clients)
    .leftJoin(clientCommunicationPreferences, eq(clientCommunicationPreferences.clientId, clients.id))
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!c) return { sms: "no_contact", email: "no_contact" };
  // SMS: the Twilio approval comes first — until it's on, nothing else matters.
  const sms: SendBlockReason | null = !deps.senders.configured("sms")
    ? "provider_off"
    : !usPhoneE164(c.phone)
      ? "no_contact"
      : !c.smsConsent
        ? "no_consent"
        : SMS_BLOCKED_STATUSES.includes(c.smsStatus ?? "")
          ? "blocked"
          : null;
  const email: SendBlockReason | null = !looksLikeEmail(c.email)
    ? "no_contact"
    : !c.emailConsent
      ? "no_consent"
      : EMAIL_BLOCKED_STATUSES.includes(c.emailStatus ?? "")
        ? "blocked"
        : !deps.senders.configured("email")
          ? "provider_off"
          : null;
  return { sms, email };
}

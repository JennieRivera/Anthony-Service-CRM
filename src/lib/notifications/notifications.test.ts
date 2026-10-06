// AUTOMATIC NOTICES TESTS (Step 3B).
//
// Pure rules (channel choice, quiet hours, STOP words, SMS wording, Twilio
// signatures) plus the engine itself against an in-memory Postgres
// (PGlite) with every migration applied and FAKE senders — nothing is ever
// really sent and the real database is never touched.
//
// Run with:
//   npx tsx src/lib/notifications/notifications.test.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import type { PortalDb } from "../portal/db";
import {
  chooseChannel,
  isStopMessage,
  isWithinSmsHours,
  nextSmsSendTime,
  type ChannelFacts,
} from "./config";
import { renderSms } from "./texts";
import { renderEmail } from "./engine";
import { DEFAULT_LEGAL_TEXTS } from "@/lib/legal/keys";
import { isValidTwilioSignature, twilioSignature } from "./twilioSignature";
import { smsSetupStatus, type Senders } from "./providers";

const { appointments, cases, clients, clientCommunicationPreferences, conversationMessages, notificationOutbox, notificationSettings, tasks } = schema;

let passed = 0;
const ok = async (name: string, fn: () => Promise<void> | void) => {
  await fn();
  passed++;
  console.log(`PASS  ${name}`);
};

// ── pure rules ────────────────────────────────────────────────────────
const facts = (over: Partial<ChannelFacts> = {}): ChannelFacts => ({
  preferredChannel: null,
  smsConsent: false,
  emailConsent: false,
  smsStatus: "consent_pending",
  emailStatus: "consent_pending",
  phone: "(555) 555-0101",
  email: "a@example.com",
  ...over,
});

async function pureTests() {
  await ok("email: short legal line + signature with phone; the long notice is not in the email", () => {
    const short = DEFAULT_LEGAL_TEXTS.not_a_law_firm_email.es;
    const { html, text } = renderEmail("Hola", "es", short, "client");
    for (const out of [html, text]) {
      assert.ok(out.includes("Anthony Multiservice no es una firma de abogados y no ofrece asesoría legal."));
      assert.ok(out.includes("Tel. (689) 342-6309"));
      assert.ok(!out.includes(DEFAULT_LEGAL_TEXTS.not_a_law_firm.es));
    }
    // Small gray type, after the signature.
    assert.ok(html.indexOf("Tel. (689) 342-6309") < html.indexOf("no ofrece asesoría legal"));
    assert.ok(/font-size:11px[^>]*>Anthony Multiservice no es una firma/.test(html));
    // Owner emails carry no client footer.
    assert.ok(!renderEmail("Hi", "en", "", "owner").html.includes("(689) 342-6309"));
  });
  await ok("channel: preferred if authorized, else SMS, else email, else none", () => {
    assert.equal(chooseChannel(facts({ smsConsent: true, emailConsent: true, preferredChannel: "email" })), "email");
    assert.equal(chooseChannel(facts({ smsConsent: true, emailConsent: true })), "sms");
    assert.equal(chooseChannel(facts({ smsConsent: true, emailConsent: true, preferredChannel: "whatsapp" })), "sms");
    assert.equal(chooseChannel(facts({ emailConsent: true, preferredChannel: "sms" })), "email");
    assert.equal(chooseChannel(facts()), null);
  });
  await ok("channel: opted-out / invalid / missing contact data is never used", () => {
    assert.equal(chooseChannel(facts({ smsConsent: true, smsStatus: "opted_out" })), null);
    assert.equal(chooseChannel(facts({ smsConsent: true, phone: "123" })), null);
    assert.equal(chooseChannel(facts({ emailConsent: true, emailStatus: "bounced" })), null);
    assert.equal(chooseChannel(facts({ emailConsent: true, email: null })), null);
  });
  await ok("quiet hours: SMS only 8 AM–8 PM Florida time (EDT and EST)", () => {
    // 2026-10-05 is EDT (UTC-4).
    assert.equal(isWithinSmsHours(new Date("2026-10-05T11:59:00Z")), false); // 7:59 AM
    assert.equal(isWithinSmsHours(new Date("2026-10-05T12:00:00Z")), true); // 8:00 AM
    assert.equal(isWithinSmsHours(new Date("2026-10-05T23:59:00Z")), true); // 7:59 PM
    assert.equal(isWithinSmsHours(new Date("2026-10-06T00:00:00Z")), false); // 8:00 PM
    // Night → next 8:00 AM Florida (EDT: 12:00Z; EST in December: 13:00Z).
    assert.equal(nextSmsSendTime(new Date("2026-10-06T02:00:00Z")).toISOString(), "2026-10-06T12:00:00.000Z");
    assert.equal(nextSmsSendTime(new Date("2026-10-05T10:00:00Z")).toISOString(), "2026-10-05T12:00:00.000Z");
    assert.equal(nextSmsSendTime(new Date("2026-12-10T03:00:00Z")).toISOString(), "2026-12-10T13:00:00.000Z");
    const day = new Date("2026-10-05T15:00:00Z");
    assert.equal(nextSmsSendTime(day), day);
  });
  await ok("STOP words in English and Spanish (accents/case ignored)", () => {
    for (const w of ["STOP", "stop", " Stop. ", "BAJA", "baja", "ALTO", "Alto!", "UNSUBSCRIBE", "cancel", "parar"]) assert.ok(isStopMessage(w), w);
    for (const w of ["hola", "stop by tomorrow", "", "START", "HELP"]) assert.ok(!isStopMessage(w), w);
  });
  await ok("every SMS starts with the business name and ends with the STOP line", () => {
    const es = renderSms("Su cita es el {date}.", "es", { date: "lunes" });
    assert.equal(es, "Anthony Multiservice: Su cita es el lunes. Responda STOP para no recibir más mensajes.");
    const en = renderSms("Anthony Multiservice: Hi. Reply STOP to opt out.", "en", {});
    assert.equal(en, "Anthony Multiservice: Hi. Reply STOP to opt out.");
  });
  await ok("SMS stays off until TWILIO_SMS_ENABLED=true (toll-free verification approved)", () => {
    const keys = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_MESSAGING_SERVICE_SID", "TWILIO_FROM_NUMBER", "TWILIO_SMS_ENABLED"];
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    for (const k of keys) delete process.env[k];
    assert.equal(smsSetupStatus(), "missing_credentials");
    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "token_test";
    assert.equal(smsSetupStatus(), "missing_sender");
    process.env.TWILIO_MESSAGING_SERVICE_SID = "MG_test";
    assert.equal(smsSetupStatus(), "not_enabled");
    process.env.TWILIO_SMS_ENABLED = "yes";
    assert.equal(smsSetupStatus(), "not_enabled", "only the exact value true");
    process.env.TWILIO_SMS_ENABLED = "true";
    assert.equal(smsSetupStatus(), "ready");
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });
  await ok("Twilio signature: matches Twilio's documented example, rejects tampering", () => {
    const url = "https://mycompany.com/myapp.php?foo=1&bar=2";
    const params = { CallSid: "CA1234567890ABCDE", Caller: "+12349013030", Digits: "1234", From: "+12349013030", To: "+18005551212" };
    assert.equal(twilioSignature("12345", url, params), "0/KCTR6DLpKmkAf8muzZqo1nDgQ=");
    assert.ok(isValidTwilioSignature("12345", "0/KCTR6DLpKmkAf8muzZqo1nDgQ=", url, params));
    assert.ok(!isValidTwilioSignature("12345", "0/KCTR6DLpKmkAf8muzZqo1nDgQ=", url, { ...params, Digits: "9999" }));
    assert.ok(!isValidTwilioSignature("12345", null, url, params));
  });
}

// ── engine on PGlite with fake senders ───────────────────────────────

async function migratedDb(): Promise<PortalDb> {
  const pg = new PGlite();
  const dir = path.join(process.cwd(), "drizzle");
  const journal = JSON.parse(fs.readFileSync(path.join(dir, "meta/_journal.json"), "utf8"));
  for (const entry of journal.entries) {
    const text = fs.readFileSync(path.join(dir, `${entry.tag}.sql`), "utf8");
    for (const statement of text.split("--> statement-breakpoint")) {
      const code = statement.split(/\r?\n/).filter((l) => !l.trim().startsWith("--")).join("").trim();
      if (code) await pg.exec(statement);
    }
  }
  return drizzle(pg, { schema }) as unknown as PortalDb;
}

type Sent = { channel: "sms" | "email"; to: string; body: string; subject?: string };
function fakeSenders(configured: { sms: boolean; email: boolean }) {
  const sent: Sent[] = [];
  const senders: Senders = {
    configured: (c) => configured[c],
    sms: async ({ to, body }) => {
      sent.push({ channel: "sms", to, body });
      return { ok: true, id: `SM${sent.length}` };
    },
    email: async ({ to, subject, text }) => {
      sent.push({ channel: "email", to, body: text, subject });
      return { ok: true, id: `em_${sent.length}` };
    },
  };
  return { senders, sent };
}

async function engineTests() {
  const db = await migratedDb();
  const engine = await import("./engine");
  const DAY = new Date("2026-10-05T15:00:00Z"); // Monday 11:00 AM Florida
  const NIGHT = new Date("2026-10-06T02:00:00Z"); // Monday 10:00 PM Florida
  const fake = fakeSenders({ sms: true, email: true });
  const deps = (now = DAY) => ({ senders: fake.senders, baseUrl: "https://crm.example", ownerFallbackEmail: "owner@example.com", now });

  const [a] = await db.insert(clients).values({ fullName: "Ana Prueba", phone: "(555) 555-0101", email: "ana@example.com", preferredLanguage: "es" }).returning();
  const [b] = await db.insert(clients).values({ fullName: "Bob Test", phone: "(555) 555-0102", email: "bob@example.com" }).returning();
  const [none] = await db.insert(clients).values({ fullName: "Nadie", phone: "(555) 555-0103" }).returning();
  await db.insert(clientCommunicationPreferences).values({ clientId: a.id, smsConsent: true, emailConsent: true });
  await db.insert(clientCommunicationPreferences).values({ clientId: b.id, emailConsent: true });
  const [caseA] = await db.insert(cases).values({ clientId: a.id, serviceType: "tax_prep", title: "Taxes A", notes: "SSN 123-45-6789 INTERNAL" }).returning();

  const live = async () =>
    db.insert(notificationSettings).values({ id: "default", testMode: false }).onConflictDoUpdate({ target: notificationSettings.id, set: { testMode: false, enabled: true } });

  await ok("test mode (default): the notice goes to the owner's test phone, never the client", async () => {
    await db.insert(notificationSettings).values({ id: "default", testMode: true, testPhone: "(555) 555-0199", testEmail: "me@example.com" });
    const r = await engine.notifyClient(db, { type: "case_update", clientId: a.id, caseId: caseA.id, dedupeKey: "t1" }, deps());
    assert.equal(r.status, "sent");
    assert.equal(fake.sent.at(-1)?.to, "+15555550199");
    assert.ok(fake.sent.at(-1)?.body.includes("[PRUEBA → Ana Prueba]"));
    assert.equal((await db.select().from(conversationMessages)).length, 0, "test sends are not logged as client communications");
  });

  await live();
  await ok("live: SMS to the client's own phone, in Spanish, nothing sensitive, logged in Communications", async () => {
    const r = await engine.notifyCaseUpdate(db, { caseId: caseA.id, clientId: a.id, status: "in_progress", documentsRequested: "W-2" }, deps());
    assert.equal(r.status, "sent");
    const msg = fake.sent.at(-1)!;
    assert.equal(msg.to, "+15555550101");
    assert.ok(msg.body.startsWith("Anthony Multiservice: Tiene una actualización en su portal: https://crm.example/es/portal"));
    assert.ok(msg.body.endsWith("Responda STOP para no recibir más mensajes."));
    assert.ok(!/123-45-6789|INTERNAL|W-2|Taxes/.test(msg.body));
    const [log] = await db.select().from(conversationMessages).where(eq(conversationMessages.clientId, a.id));
    assert.equal(log.channel, "sms");
    assert.equal(log.direction, "outbound");
  });

  await ok("no duplicates: the same notice twice is sent once", async () => {
    const before = fake.sent.length;
    const r = await engine.notifyCaseUpdate(db, { caseId: caseA.id, clientId: a.id, status: "in_progress", documentsRequested: "W-2" }, deps());
    assert.equal(r.status, "duplicate");
    assert.equal(fake.sent.length, before);
  });

  await ok("cancelled cases never notify", async () => {
    const r = await engine.notifyCaseUpdate(db, { caseId: caseA.id, clientId: a.id, status: "cancelled", documentsRequested: null }, deps());
    assert.equal(r.status, "disabled");
  });

  await ok("preferred channel wins when authorized (email for B; B's notice never uses A's contact)", async () => {
    const r = await engine.notifyClient(db, { type: "case_update", clientId: b.id, dedupeKey: "b1" }, deps());
    assert.equal(r.status, "sent");
    assert.equal(fake.sent.at(-1)?.channel, "email");
    assert.equal(fake.sent.at(-1)?.to, "bob@example.com");
    assert.ok(fake.sent.at(-1)?.body.includes("Anthony Multiservice is not a law firm"), "email footer carries the notice");
  });

  await ok("no authorized channel → nothing sent, one 'Call the client' task (not duplicated)", async () => {
    const before = fake.sent.length;
    assert.equal((await engine.notifyClient(db, { type: "case_update", clientId: none.id, dedupeKey: "n1" }, deps())).status, "no_channel");
    assert.equal((await engine.notifyClient(db, { type: "case_update", clientId: none.id, dedupeKey: "n1" }, deps())).status, "duplicate");
    assert.equal(fake.sent.length, before);
    const callTasks = await db.select().from(tasks).where(eq(tasks.type, "call_client"));
    assert.equal(callTasks.length, 1);
    assert.equal(callTasks[0].clientId, none.id);
  });

  await ok("night: SMS waits until 8:00 AM, then goes out on the next run", async () => {
    const before = fake.sent.length;
    const r = await engine.notifyClient(db, { type: "case_update", clientId: a.id, dedupeKey: "night1" }, deps(NIGHT));
    assert.equal(r.status, "scheduled");
    assert.equal(fake.sent.length, before);
    assert.equal(await engine.dispatchDueNotices(db, deps(new Date("2026-10-06T03:00:00Z"))), 0, "still night");
    assert.equal(await engine.dispatchDueNotices(db, deps(new Date("2026-10-06T12:05:00Z"))), 1, "8:05 AM");
    assert.equal(fake.sent.length, before + 1);
  });

  await ok("SMS provider not connected → falls back to the next authorized channel", async () => {
    const emailOnly = fakeSenders({ sms: false, email: true });
    const r = await engine.notifyClient(db, { type: "case_update", clientId: a.id, dedupeKey: "fallback1" }, { ...deps(), senders: emailOnly.senders });
    assert.equal(r.status, "sent");
    assert.equal(emailOnly.sent[0].channel, "email");
  });

  await ok("portal link: the real link is sent, but only '[link]' is stored", async () => {
    const secret = "https://crm.example/es/portal/access#SECRET_TOKEN_123";
    const r = await engine.notifyClient(db, { type: "portal_link", clientId: a.id, dedupeKey: "link1", secretLink: secret, onlyChannel: "email" }, deps());
    assert.equal(r.status, "sent");
    assert.ok(fake.sent.at(-1)!.body.includes("SECRET_TOKEN_123"));
    const rows = await db.select().from(notificationOutbox).where(eq(notificationOutbox.dedupeKey, "link1"));
    assert.ok(rows[0].body?.includes("[link]") && !rows[0].body.includes("SECRET"));
    const logs = await db.select().from(conversationMessages);
    assert.ok(logs.every((l) => !(l.fullMessage ?? "").includes("SECRET")));
  });

  await ok("portal link by SMS at night is refused (the token is never stored to send later)", async () => {
    const r = await engine.notifyClient(db, { type: "portal_link", clientId: a.id, dedupeKey: "link2", secretLink: "https://x/#T", onlyChannel: "sms" }, deps(NIGHT));
    assert.deepEqual(r, { status: "skipped", reason: "outside_sms_hours" });
  });

  await ok("STOP reply withdraws SMS consent; the next notice uses email instead", async () => {
    let recorded = 0;
    const n = await engine.applySmsStop(db, { fromPhone: "+15555550101", text: "BAJA" }, async () => {
      recorded++;
    });
    assert.equal(n, 1);
    assert.equal(recorded, 1);
    const [prefs] = await db.select().from(clientCommunicationPreferences).where(eq(clientCommunicationPreferences.clientId, a.id));
    assert.equal(prefs.smsConsent, false);
    assert.equal(prefs.smsStatus, "opted_out");
    const r = await engine.notifyClient(db, { type: "case_update", clientId: a.id, dedupeKey: "afterstop" }, deps());
    assert.equal(r.status === "sent" && r.channel, "email");
    const [bPrefs] = await db.select().from(clientCommunicationPreferences).where(eq(clientCommunicationPreferences.clientId, b.id));
    assert.equal(bPrefs.smsStatus, "consent_pending", "another client's number is untouched");
  });

  await ok("reminders (fallback, precise off): tomorrow's confirmed appointments only, from 9 AM, once", async () => {
    await db.update(notificationSettings).set({ preciseReminders: false });
    const tomorrow10 = new Date("2026-10-06T14:00:00Z");
    const [conf] = await db.insert(appointments).values({ clientId: b.id, title: "x", serviceType: "notary", startAt: tomorrow10, endAt: new Date(tomorrow10.getTime() + 1800000), status: "confirmed" }).returning();
    await db.insert(appointments).values({ clientId: b.id, title: "y", serviceType: "notary", startAt: tomorrow10, endAt: new Date(tomorrow10.getTime() + 1800000), status: "requested" });
    assert.equal(await engine.queueDueReminders(db, deps(new Date("2026-10-05T05:00:00Z"))), 0, "not at 1 AM");
    const nineAm = new Date("2026-10-05T13:00:00Z");
    assert.equal(await engine.queueDueReminders(db, deps(nineAm)), 1);
    assert.equal(await engine.queueDueReminders(db, deps(nineAm)), 0, "not twice");
    const rows = await db.select().from(notificationOutbox).where(eq(notificationOutbox.appointmentId, conf.id));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].type, "appointment_reminder_24h");
  });

  await ok("precise reminders are the default (Vercel Pro)", async () => {
    const fresh = await migratedDb();
    assert.equal((await engine.getNotificationSettings(fresh)).preciseReminders, true);
    await fresh.insert(notificationSettings).values({ id: "default" });
    assert.equal((await engine.getNotificationSettings(fresh)).preciseReminders, true);
  });

  await ok("reminders (precise): 24 h and 2 h before, once each, every-15-minute runs", async () => {
    await db.update(notificationSettings).set({ preciseReminders: true });
    const start = new Date("2026-10-08T16:00:00Z");
    const [appt] = await db.insert(appointments).values({ clientId: b.id, title: "z", serviceType: "tax_prep", startAt: start, endAt: new Date(start.getTime() + 3600000), status: "scheduled" }).returning();
    // Simulate the cron every 15 minutes from 30 h before to the start.
    for (let t = start.getTime() - 30 * 3600000; t < start.getTime(); t += 15 * 60000) {
      await engine.queueDueReminders(db, deps(new Date(t)));
    }
    const types = (await db.select().from(notificationOutbox).where(eq(notificationOutbox.appointmentId, appt.id))).map((r) => r.type).sort();
    assert.deepEqual(types, ["appointment_reminder_24h", "appointment_reminder_2h"]);
  });

  await ok("reminders (precise): skipped right after a confirmation, and none inside the last hour", async () => {
    const start = new Date("2026-10-10T15:00:00Z");
    const [appt] = await db.insert(appointments).values({ clientId: b.id, title: "w", serviceType: "tax_prep", startAt: start, endAt: new Date(start.getTime() + 3600000), status: "scheduled" }).returning();
    // Confirmed 22 h before → no 24 h reminder in the next runs.
    const confirmedAt = new Date(start.getTime() - 22 * 3600000);
    await engine.notifyAppointmentConfirmed(db, appt.id, deps(confirmedAt));
    for (let t = confirmedAt.getTime(); t < start.getTime() - 20 * 3600000; t += 15 * 60000) {
      await engine.queueDueReminders(db, deps(new Date(t)));
    }
    // A run 30 minutes before the start: too late for the 2 h reminder.
    await engine.queueDueReminders(db, deps(new Date(start.getTime() - 30 * 60000)));
    const types = (await db.select().from(notificationOutbox).where(eq(notificationOutbox.appointmentId, appt.id))).map((r) => r.type);
    assert.deepEqual(types, ["appointment_confirmed"]);
  });

  await ok("appointment confirmed: date and time only", async () => {
    const start = new Date("2026-10-09T19:00:00Z");
    const [appt] = await db.insert(appointments).values({ clientId: b.id, title: "Immigration — SECRET", serviceType: "immigration", startAt: start, endAt: new Date(start.getTime() + 3600000), status: "scheduled", notes: "A-number 123456789" }).returning();
    const r = await engine.notifyAppointmentConfirmed(db, appt.id, deps());
    assert.equal(r.status, "sent");
    const msg = fake.sent.at(-1)!;
    assert.ok(msg.body.includes("3:00 PM"));
    // (The email footer's "not a law firm" notice mentions immigration advice; the
    // appointment's own title, service and notes must never appear.)
    assert.ok(!/SECRET|123456789|Immigration —/.test(msg.body + (msg.subject ?? "")));
  });

  await ok("owner alerts go only to the owner's email", async () => {
    const r = await engine.notifyOwnerDocumentUploaded(db, { documentId: "00000000-0000-0000-0000-000000000001", clientId: a.id }, deps());
    assert.equal(r.status, "sent");
    assert.equal(fake.sent.at(-1)?.to, "owner@example.com");
    assert.ok(fake.sent.at(-1)?.body.includes("Ana Prueba"));
  });

  await ok("master switch off → nothing at all", async () => {
    await db.update(notificationSettings).set({ enabled: false });
    const before = fake.sent.length;
    assert.equal((await engine.notifyClient(db, { type: "case_update", clientId: b.id, dedupeKey: "off1" }, deps())).status, "disabled");
    assert.equal((await engine.notifyOwnerDocumentUploaded(db, { documentId: "00000000-0000-0000-0000-000000000002", clientId: a.id }, deps())).status, "disabled");
    assert.equal(await engine.queueDueReminders(db, deps()), 0);
    assert.equal(fake.sent.length, before);
  });
}

async function main() {
  await pureTests();
  await engineTests();
  console.log(`\nnotifications.test.ts: all ${passed} checks passed.`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });

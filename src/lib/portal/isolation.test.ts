// CLIENT-ISOLATION TESTS for the client portal (Step 2A).
//
// Applies every migration in /drizzle to an in-memory Postgres (PGlite —
// a dev dependency, never touches the real database), seeds two clients,
// A and B, and then — acting as client A — tries to read, download and
// modify B's cases, appointments and documents through every function in
// src/lib/portal/queries.ts and src/lib/portal/access.ts. Everything that
// isn't A's own must come back as "not found".
//
// Run with:
//   npx tsx src/lib/portal/isolation.test.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import type { PortalDb } from "./db";

process.env.AUTH_SECRET ??= "isolation-test-secret";

const {
  appointments, cases, clients, documents, tasks, portalAccessLinks, portalSessions,
} = schema;

async function migratedDb(): Promise<{ db: PortalDb; pg: PGlite }> {
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
  return { db: drizzle(pg, { schema }) as unknown as PortalDb, pg };
}

async function main() {
  const { db } = await migratedDb();
  const q = await import("./queries");
  const access = await import("./access");

  // ── seed ────────────────────────────────────────────────────────────
  const [a] = await db.insert(clients).values({ fullName: "Client A", phone: "(555) 555-0101", email: "a@example.com" }).returning();
  const [b] = await db.insert(clients).values({ fullName: "Client B", phone: "(555) 555-0102", email: "b@example.com" }).returning();
  const [noPhone] = await db.insert(clients).values({ fullName: "No Phone" }).returning();

  const [caseA] = await db.insert(cases).values({ clientId: a.id, serviceType: "tax_prep", title: "Taxes A", notes: "INTERNAL A", fee: "500.00", nextAction: "Send W-2", documentsRequested: "W-2" }).returning();
  const [caseB] = await db.insert(cases).values({ clientId: b.id, serviceType: "immigration", title: "Immigration B", notes: "INTERNAL B" }).returning();

  const future = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  const futureEnd = new Date(future.getTime() + 30 * 60 * 1000);
  const [apptA] = await db.insert(appointments).values({ clientId: a.id, title: "Staff title A", serviceType: "tax_prep", startAt: future, endAt: futureEnd, notes: "INTERNAL" }).returning();
  const [apptB] = await db.insert(appointments).values({ clientId: b.id, title: "Staff title B", serviceType: "immigration", startAt: future, endAt: futureEnd }).returning();
  await db.insert(appointments).values({ clientId: a.id, title: "Old", serviceType: "tax_prep", startAt: future, endAt: futureEnd, status: "rescheduled" });

  const doc = (clientId: string, name: string, extra: Partial<typeof documents.$inferInsert> = {}) =>
    db.insert(documents).values({ clientId, fileName: name, blobUrl: `https://blob.example/${name}`, ...extra }).returning().then((r) => r[0]);
  const docAUploaded = await doc(a.id, "a-upload.pdf", { uploadedByClient: true, visibleToClient: true, caseId: caseA.id });
  const docAHidden = await doc(a.id, "a-internal.pdf", { caseId: caseA.id });
  const docAVisible = await doc(a.id, "a-visible.pdf", { visibleToClient: true });
  const docBUploaded = await doc(b.id, "b-upload.pdf", { uploadedByClient: true, visibleToClient: true, caseId: caseB.id });
  const docBVisible = await doc(b.id, "b-visible.pdf", { visibleToClient: true });

  let passed = 0;
  const ok = (name: string, fn: () => Promise<void> | void) =>
    Promise.resolve(fn()).then(() => { passed++; console.log(`PASS  ${name}`); });

  // ── cases ───────────────────────────────────────────────────────────
  await ok("A lists only A's cases", async () => {
    const list = await q.listPortalCases(db, a.id);
    assert.deepEqual(list.map((c) => c.id), [caseA.id]);
  });
  await ok("case rows never include internal notes or fees", async () => {
    const [row] = await q.listPortalCases(db, a.id);
    assert.ok(!("notes" in row) && !("fee" in row) && !("paymentStatus" in row));
    assert.ok(!JSON.stringify(row).includes("INTERNAL"));
  });
  await ok("A cannot open B's case (null → 404)", async () => {
    assert.equal(await q.getPortalCase(db, a.id, caseB.id), null);
  });
  await ok("malformed / unknown case ids → null", async () => {
    assert.equal(await q.getPortalCase(db, a.id, "not-a-uuid"), null);
    assert.equal(await q.getPortalCase(db, a.id, "00000000-0000-0000-0000-000000000000"), null);
    assert.equal(await q.getPortalCase(db, a.id, { id: caseB.id }), null);
  });
  await ok("A can open A's case", async () => {
    assert.equal((await q.getPortalCase(db, a.id, caseA.id))?.title, "Taxes A");
  });

  // ── appointments ────────────────────────────────────────────────────
  await ok("A lists only A's appointments (no superseded 'rescheduled' rows)", async () => {
    const list = await q.listPortalAppointments(db, a.id);
    assert.deepEqual(list.map((x) => x.id), [apptA.id]);
    assert.ok(!("title" in list[0]) && !("notes" in list[0]) && !("location" in list[0]));
  });
  await ok("A cannot open B's appointment", async () => {
    assert.equal(await q.getPortalAppointment(db, a.id, apptB.id), null);
  });
  await ok("A cannot request a change to B's appointment, and no task is created", async () => {
    await assert.rejects(
      q.requestAppointmentChange(db, { clientId: a.id, appointmentId: apptB.id, kind: "cancel", message: "x" }),
      q.PortalNotFoundError,
    );
    const bTasks = await db.select().from(tasks).where(eq(tasks.appointmentId, apptB.id));
    assert.equal(bTasks.length, 0);
  });
  await ok("A can request a change to A's appointment, once", async () => {
    assert.equal(await q.requestAppointmentChange(db, { clientId: a.id, appointmentId: apptA.id, kind: "reschedule", message: "4 PM?" }), "created");
    assert.equal(await q.requestAppointmentChange(db, { clientId: a.id, appointmentId: apptA.id, kind: "cancel", message: "" }), "already_requested");
    const [task] = await db.select().from(tasks).where(eq(tasks.appointmentId, apptA.id));
    assert.equal(task.clientId, a.id);
    assert.equal(task.type, "appointment_change_request");
    const [unchanged] = await db.select().from(appointments).where(eq(appointments.id, apptA.id));
    assert.equal(unchanged.status, "scheduled");
  });

  // ── documents ───────────────────────────────────────────────────────
  await ok("A sees A's uploads + docs marked visible, never A's hidden docs or B's", async () => {
    const ids = (await q.listPortalDocuments(db, a.id)).map((d) => d.id).sort();
    assert.deepEqual(ids, [docAUploaded.id, docAVisible.id].sort());
  });
  await ok("document rows never include the blob URL", async () => {
    const [row] = await q.listPortalDocuments(db, a.id);
    assert.ok(!("blobUrl" in row));
  });
  await ok("filtering by B's case returns nothing for A", async () => {
    assert.equal((await q.listPortalDocuments(db, a.id, { caseId: caseB.id })).length, 0);
  });
  await ok("A cannot download B's documents (uploaded or visible)", async () => {
    assert.equal(await q.getPortalDocumentFile(db, a.id, docBUploaded.id), null);
    assert.equal(await q.getPortalDocumentFile(db, a.id, docBVisible.id), null);
  });
  await ok("A cannot download A's own NON-visible staff document", async () => {
    assert.equal(await q.getPortalDocumentFile(db, a.id, docAHidden.id), null);
  });
  await ok("A can download A's visible document", async () => {
    assert.equal((await q.getPortalDocumentFile(db, a.id, docAVisible.id))?.fileName, "a-visible.pdf");
  });
  await ok("A cannot upload into B's case, and nothing is written", async () => {
    const before = (await db.select().from(documents)).length;
    await assert.rejects(
      q.recordClientUpload(db, { clientId: a.id, caseId: caseB.id, fileName: "x.pdf", blobUrl: "https://blob.example/x", sensitiveDataReason: null }),
      q.PortalNotFoundError,
    );
    assert.equal((await db.select().from(documents)).length, before);
  });
  await ok("A's upload lands on A, flagged, visible to A, with a review task", async () => {
    const { documentId } = await q.recordClientUpload(db, { clientId: a.id, caseId: caseA.id, fileName: "w2.pdf", blobUrl: "https://blob.example/w2", sensitiveDataReason: "ssn" });
    const [row] = await db.select().from(documents).where(eq(documents.id, documentId));
    assert.equal(row.clientId, a.id);
    assert.ok(row.uploadedByClient && row.visibleToClient && row.sensitiveDataReason === "ssn");
    const reviewTasks = await db.select().from(tasks).where(eq(tasks.type, "document_review"));
    assert.equal(reviewTasks.length, 1);
    assert.equal(reviewTasks[0].clientId, a.id);
    assert.equal(await q.getPortalDocumentFile(db, b.id, documentId), null);
  });

  await ok("booking prefill returns only the session client's own contact data", async () => {
    assert.deepEqual(await q.getPortalBookingPrefill(db, a.id), { fullName: "Client A", phone: "(555) 555-0101", email: "a@example.com" });
  });

  // ── access links & sessions ─────────────────────────────────────────
  const link = await access.createPortalAccessLink(db, { clientId: a.id, createdByEmail: "staff@example.com" });
  await ok("tokens are stored only as hashes", async () => {
    const rows = await db.select().from(portalAccessLinks);
    assert.ok(rows.every((r) => r.tokenHash !== link.token && r.tokenHash.length === 64));
  });
  await ok("wrong last 4 digits (including B's) → invalid", async () => {
    assert.deepEqual(await access.redeemPortalAccessLink(db, { token: link.token, lastFour: "0102", ipKey: null }), { ok: false, reason: "invalid" });
    assert.deepEqual(await access.redeemPortalAccessLink(db, { token: link.token, lastFour: "", ipKey: null }), { ok: false, reason: "invalid" });
  });
  let sessionA = "";
  await ok("right last 4 digits → a session for A, and only A", async () => {
    const r = await access.redeemPortalAccessLink(db, { token: link.token, lastFour: "0101", ipKey: null });
    assert.ok(r.ok && r.clientId === a.id);
    sessionA = r.ok ? r.sessionToken : "";
    assert.equal((await access.resolvePortalSession(db, sessionA))?.clientId, a.id);
  });
  await ok("a link works only once", async () => {
    assert.equal((await access.redeemPortalAccessLink(db, { token: link.token, lastFour: "0101", ipKey: null })).ok, false);
  });
  await ok("garbage / forged session tokens resolve to nothing", async () => {
    assert.equal(await access.resolvePortalSession(db, "x".repeat(43)), null);
    assert.equal(await access.resolvePortalSession(db, link.token), null); // a LINK token is not a session token
    assert.equal(await access.resolvePortalSession(db, undefined), null);
  });
  await ok("an expired link is refused", async () => {
    const l = await access.createPortalAccessLink(db, { clientId: b.id, createdByEmail: null, now: new Date(Date.now() - 8 * 24 * 3600 * 1000) });
    assert.equal((await access.redeemPortalAccessLink(db, { token: l.token, lastFour: "0102", ipKey: null })).ok, false);
  });
  await ok("5 wrong answers lock the link, even for the right digits", async () => {
    const l = await access.createPortalAccessLink(db, { clientId: b.id, createdByEmail: null });
    for (let i = 0; i < 4; i++) await access.redeemPortalAccessLink(db, { token: l.token, lastFour: "9999", ipKey: null });
    assert.deepEqual(await access.redeemPortalAccessLink(db, { token: l.token, lastFour: "9999", ipKey: null }), { ok: false, reason: "locked" });
    assert.equal((await access.redeemPortalAccessLink(db, { token: l.token, lastFour: "0102", ipKey: null })).ok, false);
  });
  await ok("a new link revokes the client's previous unused link", async () => {
    const first = await access.createPortalAccessLink(db, { clientId: b.id, createdByEmail: null });
    await access.createPortalAccessLink(db, { clientId: b.id, createdByEmail: null });
    assert.equal((await access.redeemPortalAccessLink(db, { token: first.token, lastFour: "0102", ipKey: null })).ok, false);
  });
  await ok("clients without a phone can't get a link", async () => {
    await assert.rejects(access.createPortalAccessLink(db, { clientId: noPhone.id, createdByEmail: null }), access.PortalAccessError);
  });
  await ok("IP limit: after 10 failures the IP is blocked, even with a valid link", async () => {
    const ip = "ip-key-test";
    for (let i = 0; i < 10; i++) await access.redeemPortalAccessLink(db, { token: "y".repeat(43), lastFour: "0000", ipKey: ip });
    const l = await access.createPortalAccessLink(db, { clientId: b.id, createdByEmail: null });
    assert.deepEqual(await access.redeemPortalAccessLink(db, { token: l.token, lastFour: "0102", ipKey: ip }), { ok: false, reason: "rate_limited" });
  });
  await ok("revoking A's access ends A's sessions but not B's", async () => {
    const lb = await access.createPortalAccessLink(db, { clientId: b.id, createdByEmail: null });
    const rb = await access.redeemPortalAccessLink(db, { token: lb.token, lastFour: "0102", ipKey: null });
    assert.ok(rb.ok);
    await access.revokePortalAccess(db, a.id);
    assert.equal(await access.resolvePortalSession(db, sessionA), null);
    assert.equal((await access.resolvePortalSession(db, rb.ok ? rb.sessionToken : ""))?.clientId, b.id);
  });
  await ok("signing out ends that session", async () => {
    const l = await access.createPortalAccessLink(db, { clientId: a.id, createdByEmail: null });
    const r = await access.redeemPortalAccessLink(db, { token: l.token, lastFour: "0101", ipKey: null });
    assert.ok(r.ok);
    await access.endPortalSession(db, r.ok ? r.sessionToken : "");
    assert.equal(await access.resolvePortalSession(db, r.ok ? r.sessionToken : ""), null);
  });
  await ok("an expired session is refused", async () => {
    const [s] = await db.select().from(portalSessions).where(eq(portalSessions.clientId, b.id));
    assert.ok(s);
    const later = new Date(Date.now() + 31 * 24 * 3600 * 1000);
    const l = await access.createPortalAccessLink(db, { clientId: b.id, createdByEmail: null });
    const r = await access.redeemPortalAccessLink(db, { token: l.token, lastFour: "0102", ipKey: null });
    assert.ok(r.ok);
    assert.equal(await access.resolvePortalSession(db, r.ok ? r.sessionToken : "", later), null);
  });

  console.log(`\nisolation.test.ts: all ${passed} client-isolation checks passed.`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });

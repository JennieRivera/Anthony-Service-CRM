// Diamante Conecta 360 — "Join" and "Sign in with my email" against an
// in-memory Postgres (PGlite) built from every migration: codes (hash
// only, 10 minutes, 5 tries, single use, bound to their purpose), limits,
// and that nobody gets in without staff approval.
//
// Run with:
//   npx tsx src/lib/partners/conecta.test.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema";
import type { PortalDb } from "@/lib/portal/db";

process.env.AUTH_SECRET ??= "conecta-test-secret";

const { partnerConsentEvents, partnerEmailCodes, strategicAlliances, tasks } = schema;

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

const application = (email: string, extra: Record<string, unknown> = {}) => ({
  businessName: `Tile Pros ${email}`,
  contactPerson: "Jose Test",
  allyType: "installer_remodeling",
  services: "Floors and tile",
  city: "Kissimmee",
  phone: "(555) 555-0701",
  email,
  website: "https://example.com",
  locale: "es",
  acceptTerms: true,
  acceptNotice: true,
  acceptContact: true,
  termsText: "TERMS",
  noticeText: "NOTICE",
  permissionText: "PERMISSION",
  ...extra,
});

async function main() {
  const db = await migratedDb();
  const c = await import("./conecta");
  const access = await import("./access");
  let passed = 0;
  const ok = async (name: string, fn: () => Promise<void>) => {
    await fn();
    passed++;
    console.log(`PASS  ${name}`);
  };
  const wrong = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, "0");

  await ok("join: all three checkboxes and valid fields are required; nothing is written", async () => {
    await assert.rejects(c.startConectaApplication(db, { input: application("a@example.com", { acceptNotice: false }), ipKey: null }), c.ConectaValidationError);
    await assert.rejects(c.startConectaApplication(db, { input: application("not-an-email"), ipKey: null }), c.ConectaValidationError);
    await assert.rejects(c.startConectaApplication(db, { input: application("a@example.com", { allyType: "attorney" }), ipKey: null }), c.ConectaValidationError);
    assert.equal(await c.countEmailCodes(db, "a@example.com"), 0);
  });

  let applicantId = "";
  await ok("join: the code is stored only as a hash; the right code creates a Prospect with no access", async () => {
    const started = await c.startConectaApplication(db, { input: application("Jose@Example.com"), ipKey: "ip-1" });
    assert.ok(started.ok);
    const [row] = await db.select().from(partnerEmailCodes).where(eq(partnerEmailCodes.email, "jose@example.com"));
    assert.ok(started.ok && !row.codeHash.includes(started.code));
    const bad = await c.verifyConectaApplication(db, { email: "jose@example.com", code: started.ok ? wrong(started.code) : "", ipKey: "ip-1", ipAddress: null, userAgent: null });
    assert.equal(bad.ok, false);
    const good = await c.verifyConectaApplication(db, { email: "JOSE@example.com", code: started.ok ? started.code : "", ipKey: "ip-1", ipAddress: "203.0.113.7", userAgent: "test" });
    assert.ok(good.ok);
    applicantId = good.ok ? good.allianceId : "";
    const [a] = await db.select().from(strategicAlliances).where(eq(strategicAlliances.id, applicantId));
    assert.equal(a.status, "prospect");
    assert.equal(a.appliedViaConecta, true);
    assert.equal(a.emailLoginEnabled, false);
    assert.equal(a.organizationType, "installer_remodeling");
    const consents = await db.select().from(partnerConsentEvents).where(eq(partnerConsentEvents.allianceId, applicantId));
    assert.deepEqual(consents.map((x) => x.consentType).sort(), ["contact_permission", "not_a_law_firm", "partner_terms"]);
    assert.ok(consents.every((x) => x.ipAddress === "203.0.113.7"));
    const [task] = await db.select().from(tasks).where(and(eq(tasks.allianceId, applicantId), eq(tasks.type, "partner_application_review")));
    assert.ok(task);
    // Single use.
    const again = await c.verifyConectaApplication(db, { email: "jose@example.com", code: started.ok ? started.code : "", ipKey: "ip-1", ipAddress: null, userAgent: null });
    assert.equal(again.ok, false);
  });

  await ok("codes: 5 wrong tries lock the code; an expired code fails; only the newest code works", async () => {
    const s1 = await c.startConectaApplication(db, { input: application("lock@example.com"), ipKey: null });
    assert.ok(s1.ok);
    for (let i = 0; i < 5; i++) await c.verifyConectaApplication(db, { email: "lock@example.com", code: s1.ok ? wrong(s1.code) : "", ipKey: null, ipAddress: null, userAgent: null });
    const locked = await c.verifyConectaApplication(db, { email: "lock@example.com", code: s1.ok ? s1.code : "", ipKey: null, ipAddress: null, userAgent: null });
    assert.equal(locked.ok, false);

    const s2 = await c.startConectaApplication(db, { input: application("late@example.com"), ipKey: null });
    const late = await c.verifyConectaApplication(db, {
      email: "late@example.com",
      code: s2.ok ? s2.code : "",
      ipKey: null,
      ipAddress: null,
      userAgent: null,
      now: new Date(Date.now() + 11 * 60 * 1000),
    });
    assert.equal(late.ok, false);

    const old = await c.startConectaApplication(db, { input: application("new@example.com"), ipKey: null });
    const fresh = await c.startConectaApplication(db, { input: application("new@example.com"), ipKey: null });
    assert.equal((await c.verifyConectaApplication(db, { email: "new@example.com", code: old.ok ? old.code : "", ipKey: null, ipAddress: null, userAgent: null })).ok, false);
    assert.equal((await c.verifyConectaApplication(db, { email: "new@example.com", code: fresh.ok ? fresh.code : "", ipKey: null, ipAddress: null, userAgent: null })).ok, true);
  });

  await ok("limits: 3 codes per email per 15 minutes; IP blocked after many wrong codes", async () => {
    for (let i = 0; i < 3; i++) assert.ok((await c.startConectaApplication(db, { input: application("busy@example.com"), ipKey: null })).ok);
    assert.deepEqual(await c.startConectaApplication(db, { input: application("busy@example.com"), ipKey: null }), { ok: false, reason: "rate_limited" });
    for (let i = 0; i < 10; i++) await c.verifyConectaApplication(db, { email: "nobody@example.com", code: "000000", ipKey: "ip-bad", ipAddress: null, userAgent: null });
    assert.deepEqual(await c.verifyConectaApplication(db, { email: "nobody@example.com", code: "000000", ipKey: "ip-bad", ipAddress: null, userAgent: null }), {
      ok: false,
      reason: "rate_limited",
    });
  });

  await ok("email sign-in: an unapproved Prospect never gets a code; after approval it does and signs in", async () => {
    const before = await c.startEmailLogin(db, { email: "jose@example.com", ipKey: null });
    assert.equal(before.send, null);
    const approved = await c.approveConectaAlliance(db, { allianceId: applicantId, staffEmail: "owner@example.com" });
    assert.equal(approved?.locale, "es");
    const [task] = await db.select().from(tasks).where(and(eq(tasks.allianceId, applicantId), eq(tasks.type, "partner_application_review")));
    assert.equal(task.status, "done");
    const started = await c.startEmailLogin(db, { email: "Jose@Example.com", ipKey: null });
    assert.ok(started.send && started.send.allianceId === applicantId);
    const bad = await c.verifyEmailLogin(db, { email: "jose@example.com", code: wrong(started.send!.code), ipKey: null });
    assert.equal(bad.ok, false);
    const good = await c.verifyEmailLogin(db, { email: "jose@example.com", code: started.send!.code, ipKey: null });
    assert.ok(good.ok);
    const session = await access.resolvePartnerSession(db, good.ok ? good.sessionToken : "");
    assert.equal(session?.allianceId, applicantId);
  });

  await ok("email sign-in: unknown email gets the same answer; a join code can't sign in; revoke turns it off", async () => {
    assert.deepEqual(await c.startEmailLogin(db, { email: "stranger@example.com", ipKey: null }), { send: null, rateLimited: false });
    // A join code for the same email is bound to "signup" — useless to sign in.
    const join = await c.startConectaApplication(db, { input: application("jose2@example.com"), ipKey: null });
    await db.update(strategicAlliances).set({ email: "jose2@example.com" }).where(eq(strategicAlliances.id, applicantId));
    assert.equal((await c.verifyEmailLogin(db, { email: "jose2@example.com", code: join.ok ? join.code : "", ipKey: null })).ok, false);

    const pending = await c.startEmailLogin(db, { email: "jose2@example.com", ipKey: null });
    assert.ok(pending.send);
    await access.revokePartnerAccess(db, applicantId);
    assert.equal((await c.verifyEmailLogin(db, { email: "jose2@example.com", code: pending.send!.code, ipKey: null })).ok, false);
    assert.equal((await c.startEmailLogin(db, { email: "jose2@example.com", ipKey: null })).send, null);
  });

  await ok("email sign-in: an active alliance without approval (never given access) can't sign in", async () => {
    const [a] = await db
      .insert(strategicAlliances)
      .values({ organizationName: "Active no access", email: "active@example.com", phone: "(555) 555-0801", status: "active_partner" })
      .returning();
    assert.equal((await c.startEmailLogin(db, { email: "active@example.com", ipKey: null })).send, null);
    // Generating the personal link is the approval: then email sign-in works.
    await access.createPartnerAccessLink(db, { allianceId: a.id, createdByEmail: "owner@example.com" });
    assert.ok((await c.startEmailLogin(db, { email: "active@example.com", ipKey: null })).send);
  });

  console.log(`\nconecta.test.ts: all ${passed} checks passed.`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);

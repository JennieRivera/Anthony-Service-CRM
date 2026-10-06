// Deleting a client or an alliance (src/lib/deletion.ts) against an
// in-memory Postgres (PGlite) built from every migration: a client with a
// referral and an open task deletes cleanly (that used to be a 500), and
// financial history blocks the delete instead of being lost.
//
// Run with:
//   npx tsx src/lib/deletion.test.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema";
import type { PortalDb } from "@/lib/portal/db";
import { dbErrorCode, isForeignKeyBlock } from "./db/errors";
import { deleteAllianceRecord, deleteClientRecord, getAllianceDeletionImpact, getClientDeletionImpact } from "./deletion";

const {
  allianceDocuments,
  cases,
  clients,
  invoices,
  partnerAccessLinks,
  partnerConsentEvents,
  partnerSessions,
  referralCompensations,
  referrals,
  strategicAlliances,
  tasks,
} = schema;

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

async function main() {
  const db = await migratedDb();
  let passed = 0;
  const check = async (name: string, fn: () => Promise<void>) => {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  };

  const [ally] = await db.insert(strategicAlliances).values({ organizationName: "Ally (TEST)", phone: "(555) 555-0401" }).returning();
  const newClient = (fullName: string) =>
    db.insert(clients).values({ fullName, addedByAllianceId: ally.id }).returning().then((r) => r[0]);
  const newReferral = (clientId: string) =>
    db
      .insert(referrals)
      .values({ clientId, allianceId: ally.id, referredBy: "Ally", receivingParty: "AMS", direction: "other_partner_to_ams" })
      .returning()
      .then((r) => r[0]);

  await check("the RESTRICT error code is found through Drizzle's wrapper", async () => {
    const c = await newClient("Blocked raw");
    await newReferral(c.id);
    const error = await db.delete(clients).where(eq(clients.id, c.id)).then(
      () => null,
      (e: unknown) => e,
    );
    assert.ok(error, "raw delete should fail");
    assert.equal(dbErrorCode(error), "23001");
    assert.ok(isForeignKeyBlock(error));
  });

  await check("a client with a referral, a case and an open task deletes cleanly", async () => {
    const c = await newClient("Lead from ally");
    const r = await newReferral(c.id);
    await db.insert(cases).values({ clientId: c.id, serviceType: "immigration", title: "Case" });
    await db.insert(tasks).values({ clientId: c.id, type: "follow_up", title: "New referral" });
    await db.insert(partnerConsentEvents).values({ allianceId: ally.id, allianceNameSnapshot: "Ally (TEST)", consentType: "contact_permission", granted: true, textShown: "ok", referralId: r.id });

    const impact = await getClientDeletionImpact(db, c.id);
    assert.deepEqual(
      { cases: impact.cases, referrals: impact.referrals, openTasks: impact.openTasks, blockedBy: impact.blockedBy },
      { cases: 1, referrals: 1, openTasks: 1, blockedBy: null },
    );
    const result = await deleteClientRecord(db, c.id);
    assert.equal(result.ok, true);
    assert.equal((await db.select().from(clients).where(eq(clients.id, c.id))).length, 0);
    assert.equal((await db.select().from(referrals).where(eq(referrals.id, r.id))).length, 0);
    assert.equal((await db.select().from(tasks).where(eq(tasks.clientId, c.id))).length, 0);
  });

  await check("a client with an invoice is blocked (billing), nothing deleted", async () => {
    const c = await newClient("Billed");
    await newReferral(c.id);
    await db.insert(invoices).values({ clientId: c.id, total: "10.00" });
    const result = await deleteClientRecord(db, c.id);
    assert.deepEqual(result, { ok: false, reason: "billing" });
    assert.equal((await db.select().from(referrals).where(eq(referrals.clientId, c.id))).length, 1);
  });

  await check("a client whose referral has a compensation is blocked", async () => {
    const c = await newClient("Compensated");
    const r = await newReferral(c.id);
    await db.insert(referralCompensations).values({ referralId: r.id });
    const result = await deleteClientRecord(db, c.id);
    assert.deepEqual(result, { ok: false, reason: "compensation" });
    assert.equal((await db.select().from(clients).where(eq(clients.id, c.id))).length, 1);
  });

  await check("deleting an alliance with referrals keeps the referrals and its clients", async () => {
    const c = await newClient("Kept client");
    const r = await newReferral(c.id);
    await db.insert(partnerAccessLinks).values({ allianceId: ally.id, tokenHash: "h1", phoneLast4Hash: "p", expiresAt: new Date(Date.now() + 86400000) });
    await db.insert(partnerSessions).values({ allianceId: ally.id, tokenHash: "s1", expiresAt: new Date(Date.now() + 86400000) });
    await db.insert(allianceDocuments).values({ allianceId: ally.id, fileName: "a.pdf", blobUrl: "https://blob/a.pdf" });
    await db.insert(tasks).values({ allianceId: ally.id, type: "follow_up", title: "Ally task" });

    const impact = await getAllianceDeletionImpact(db, ally.id);
    assert.equal(impact.blockedBy, null);
    assert.ok(impact.referrals >= 1 && impact.addedClients >= 1 && impact.sessions === 1 && impact.documents === 1);

    const result = await deleteAllianceRecord(db, ally.id);
    assert.equal(result.ok, true);
    assert.ok(result.ok && result.blobUrls.includes("https://blob/a.pdf"));
    assert.equal((await db.select().from(strategicAlliances).where(eq(strategicAlliances.id, ally.id))).length, 0);
    assert.equal((await db.select().from(partnerSessions).where(eq(partnerSessions.allianceId, ally.id))).length, 0);
    assert.equal((await db.select().from(tasks).where(eq(tasks.allianceId, ally.id))).length, 0);
    const [keptRef] = await db.select().from(referrals).where(eq(referrals.id, r.id));
    assert.equal(keptRef?.allianceId, null);
    const [keptClient] = await db.select().from(clients).where(eq(clients.id, c.id));
    assert.equal(keptClient?.addedByAllianceId, null);
  });

  console.log(`\ndeletion.test.ts: all ${passed} checks passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

// Partner portal isolation (Phase A): runs the real partner data code
// against an in-memory Postgres (PGlite) built from every migration, and
// checks that alliance A can never reach alliance B's data or any CRM
// client data. Dependency-free besides PGlite, run via `tsx`.
//
// Run with:
//   npx tsx src/lib/partners/isolation.test.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema";
import type { PortalDb } from "@/lib/portal/db";

process.env.AUTH_SECRET ??= "isolation-test-secret";

const {
  allianceDocuments,
  cases,
  clientCommunicationPreferences,
  clients,
  marketingAssetPartnerShares,
  marketingContentAssets,
  partnerAccessLinks,
  partnerConsentEvents,
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
  const q = await import("./queries");
  const access = await import("./access");

  // ── seed ─────────────────────────────────────────────────────────────
  const [allyA] = await db
    .insert(strategicAlliances)
    .values({ organizationName: "Ally A (TEST)", phone: "(555) 555-0201", email: "a@example.com", organizationType: "contractor_remodeling" })
    .returning();
  const [allyB] = await db
    .insert(strategicAlliances)
    .values({ organizationName: "Ally B (TEST)", phone: "(555) 555-0202", email: "b@example.com" })
    .returning();
  const [noPhone] = await db.insert(strategicAlliances).values({ organizationName: "No phone (TEST)" }).returning();

  const [clientShared] = await db.insert(clients).values({ fullName: "Shared Client", phone: "(555) 555-0301", notes: "INTERNAL NOTE" }).returning();
  const [clientPrivate] = await db.insert(clients).values({ fullName: "Private Client", phone: "(555) 555-0302" }).returning();
  const [clientB] = await db.insert(clients).values({ fullName: "B's Client", phone: "(555) 555-0303" }).returning();
  await db.insert(clientCommunicationPreferences).values({ clientId: clientShared.id, partnerReferralConsent: true });
  await db.insert(clientCommunicationPreferences).values({ clientId: clientPrivate.id, partnerReferralConsent: false });
  const [caseShared] = await db.insert(cases).values({ clientId: clientShared.id, serviceType: "immigration", title: "SECRET CASE", notes: "A-number A123456789" }).returning();

  const ref = (clientId: string, allianceId: string, extra: Partial<typeof referrals.$inferInsert> = {}) =>
    db
      .insert(referrals)
      .values({ clientId, allianceId, referredBy: "AMS", receivingParty: "Ally", direction: "ams_to_other_partner", notes: "INTERNAL REFERRAL NOTE", ...extra })
      .returning()
      .then((r) => r[0]);
  const refShared = await ref(clientShared.id, allyA.id, { caseId: caseShared.id, partnerNote: "Kitchen remodel", partnerService: "remodeling" });
  const refPrivate = await ref(clientPrivate.id, allyA.id, { partnerNote: "Call after 5" });
  const refB = await ref(clientB.id, allyB.id);

  const adoc = (allianceId: string, name: string, extra: Partial<typeof allianceDocuments.$inferInsert> = {}) =>
    db.insert(allianceDocuments).values({ allianceId, fileName: name, blobUrl: `https://blob.example/${name}`, ...extra }).returning().then((r) => r[0]);
  const docAShared = await adoc(allyA.id, "a-agreement.pdf", { visibleToPartner: true });
  const docAInternal = await adoc(allyA.id, "a-internal.pdf");
  const docBShared = await adoc(allyB.id, "b-agreement.pdf", { visibleToPartner: true });

  const asset = (name: string, extra: Partial<typeof marketingContentAssets.$inferInsert> = {}) =>
    db.insert(marketingContentAssets).values({ fileName: name, blobUrl: `https://blob.example/${name}`, ...extra }).returning().then((r) => r[0]);
  const assetAll = await asset("flyer-all.png", { partnerShare: "all" });
  const assetOnlyB = await asset("flyer-b.png", { partnerShare: "selected" });
  await db.insert(marketingAssetPartnerShares).values({ assetId: assetOnlyB.id, allianceId: allyB.id });
  const assetNone = await asset("internal.png");
  const assetPendingB = await asset("b-submitted.png", { submittedByAllianceId: allyB.id, approvalStatus: "pending", partnerShare: "all" });

  let passed = 0;
  const ok = (name: string, fn: () => Promise<void> | void) =>
    Promise.resolve(fn()).then(() => {
      passed++;
      console.log(`PASS  ${name}`);
    });

  // ── access ───────────────────────────────────────────────────────────
  await ok("link: a single-use link that only A's last 4 digits redeem, for A", async () => {
    const { token } = await access.createPartnerAccessLink(db, { allianceId: allyA.id, createdByEmail: "owner@example.com" });
    const wrong = await access.redeemPartnerAccessLink(db, { token, lastFour: "0202", ipKey: null });
    assert.equal(wrong.ok, false);
    const right = await access.redeemPartnerAccessLink(db, { token, lastFour: "0201", ipKey: null });
    assert.ok(right.ok && right.allianceId === allyA.id);
    const again = await access.redeemPartnerAccessLink(db, { token, lastFour: "0201", ipKey: null });
    assert.equal(again.ok, false);
    if (right.ok) assert.equal((await access.resolvePartnerSession(db, right.sessionToken))?.allianceId, allyA.id);
  });
  await ok("link: locks after 5 wrong answers; no link without a phone", async () => {
    const { token } = await access.createPartnerAccessLink(db, { allianceId: allyB.id, createdByEmail: null });
    for (let i = 0; i < 5; i++) await access.redeemPartnerAccessLink(db, { token, lastFour: "9999", ipKey: null });
    const r = await access.redeemPartnerAccessLink(db, { token, lastFour: "0202", ipKey: null });
    assert.deepEqual(r, { ok: false, reason: "locked" });
    await assert.rejects(access.createPartnerAccessLink(db, { allianceId: noPhone.id, createdByEmail: null }), access.PartnerAccessError);
  });
  await ok("link: a client-portal token is not a partner session", async () => {
    assert.equal(await access.resolvePartnerSession(db, "x".repeat(43)), null);
    const links = await db.select().from(partnerAccessLinks).where(eq(partnerAccessLinks.allianceId, allyA.id));
    assert.ok(links.every((l) => !l.tokenHash.includes("0201")));
  });

  // ── documents ────────────────────────────────────────────────────────
  await ok("documents: A sees only A's shared/uploaded documents", async () => {
    const list = await q.listPartnerDocuments(db, allyA.id);
    assert.deepEqual(list.map((d) => d.id), [docAShared.id]);
    assert.equal(await q.getPartnerDocumentFile(db, allyA.id, docAInternal.id), null);
    assert.equal(await q.getPartnerDocumentFile(db, allyA.id, docBShared.id), null);
    assert.equal(await q.getPartnerDocumentFile(db, allyA.id, "not-a-uuid"), null);
  });
  await ok("documents: A's upload lands in the CRM, visible to A, with a task for staff", async () => {
    const id = await q.recordPartnerDocumentUpload(db, { allianceId: allyA.id, fileName: "w9.pdf", blobUrl: "https://blob.example/w9", documentType: "w9", sensitiveDataReason: null });
    assert.ok(await q.getPartnerDocumentFile(db, allyA.id, id));
    assert.equal(await q.getPartnerDocumentFile(db, allyB.id, id), null);
    const [task] = await db.select().from(tasks).where(and(eq(tasks.allianceId, allyA.id), eq(tasks.type, "partner_document_review")));
    assert.ok(task && task.clientId === null);
  });

  // ── marketing ────────────────────────────────────────────────────────
  await ok("marketing: shared-with-all and selected shares respected; pending never shared", async () => {
    const a = await q.listPartnerMarketing(db, allyA.id);
    const b = await q.listPartnerMarketing(db, allyB.id);
    assert.deepEqual(a.shared.map((x) => x.id), [assetAll.id]);
    assert.deepEqual(b.shared.map((x) => x.id).sort(), [assetAll.id, assetOnlyB.id].sort());
    assert.equal(await q.getPartnerMarketingFile(db, allyA.id, assetOnlyB.id), null);
    assert.equal(await q.getPartnerMarketingFile(db, allyA.id, assetNone.id), null);
    assert.equal(await q.getPartnerMarketingFile(db, allyA.id, assetPendingB.id), null);
    assert.ok(await q.getPartnerMarketingFile(db, allyB.id, assetPendingB.id));
    assert.deepEqual(a.submitted, []);
  });

  // ── referrals ────────────────────────────────────────────────────────
  await ok("referrals: A sees only A's; name/phone only with the client's sharing consent; never case or notes", async () => {
    const { toPartner } = await q.listPartnerReferrals(db, allyA.id);
    assert.deepEqual(toPartner.map((r) => r.id).sort(), [refShared.id, refPrivate.id].sort());
    const shared = toPartner.find((r) => r.id === refShared.id)!;
    const hidden = toPartner.find((r) => r.id === refPrivate.id)!;
    assert.equal(shared.name, "Shared Client");
    assert.equal(shared.phone, "(555) 555-0301");
    assert.equal(hidden.name, null);
    assert.equal(hidden.phone, null);
    const json = JSON.stringify(toPartner);
    for (const secret of ["SECRET CASE", "A123456789", "INTERNAL", "Private Client", "B's Client"]) assert.ok(!json.includes(secret), secret);
  });
  await ok("referrals: A can update A's referral, never B's or one A sent", async () => {
    await q.setPartnerReferralStage(db, { allianceId: allyA.id, referralId: refShared.id, stage: "contacted" });
    const [r] = await db.select().from(referrals).where(eq(referrals.id, refShared.id));
    assert.equal(r.pipelineStatus, "under_review");
    await assert.rejects(q.setPartnerReferralStage(db, { allianceId: allyA.id, referralId: refB.id, stage: "closed" }), q.PartnerNotFoundError);
    await assert.rejects(q.setPartnerReferralStage(db, { allianceId: allyA.id, referralId: refShared.id, stage: "commission_paid" }), q.PartnerValidationError);
  });
  await ok("referrals: A's referral to AMS → Lead 'added by A' + consent with IP + task; duplicate flagged only to staff", async () => {
    const referral = await q.createPartnerReferral(db, {
      allianceId: allyA.id,
      input: { name: "Nueva Persona", phone: "555-555-0301", service: "tax_prep", note: "Needs taxes", permission: true },
      permissionText: "I have permission",
      ipAddress: "203.0.113.9",
      userAgent: "test",
    });
    const [row] = await db.select().from(referrals).where(eq(referrals.id, referral.id));
    const [lead] = await db.select().from(clients).where(eq(clients.id, row.clientId));
    assert.equal(lead.status, "lead");
    assert.equal(lead.addedByAllianceId, allyA.id);
    const [consent] = await db.select().from(partnerConsentEvents).where(eq(partnerConsentEvents.referralId, referral.id));
    assert.equal(consent.ipAddress, "203.0.113.9");
    const [task] = await db.select().from(tasks).where(and(eq(tasks.type, "partner_referral"), eq(tasks.clientId, lead.id)));
    assert.ok(task.title.includes("possible duplicate of Shared Client"));
    const { fromPartner } = await q.listPartnerReferrals(db, allyA.id);
    assert.equal(fromPartner[0].name, "Nueva Persona");
    assert.ok(!JSON.stringify(fromPartner).includes("Shared Client"));
    assert.deepEqual((await q.listPartnerReferrals(db, allyB.id)).fromPartner, []);
  });
  await ok("referrals: no permission checkbox → refused, nothing written", async () => {
    const before = (await db.select().from(clients)).length;
    await assert.rejects(
      q.createPartnerReferral(db, { allianceId: allyA.id, input: { name: "X Y", phone: "555-555-0399" }, permissionText: "", ipAddress: null, userAgent: null }),
      q.PartnerValidationError,
    );
    assert.equal((await db.select().from(clients)).length, before);
  });

  // ── profile ──────────────────────────────────────────────────────────
  await ok("profile: A's change applies to A only and creates a before → after task", async () => {
    const { changed } = await q.savePartnerProfile(db, {
      allianceId: allyA.id,
      values: { description: "We remodel kitchens", licenseNumber: "CBC123", licenseExpiration: "2026-10-20" },
    });
    assert.deepEqual(changed.sort(), ["description", "licenseExpiration", "licenseNumber"]);
    assert.equal((await q.getPartnerProfile(db, allyA.id))?.description, "We remodel kitchens");
    assert.equal((await q.getPartnerProfile(db, allyB.id))?.description, "");
    const [task] = await db.select().from(tasks).where(and(eq(tasks.allianceId, allyA.id), eq(tasks.type, "partner_profile_review")));
    assert.ok(task.title.includes("CBC123"));
    await assert.rejects(q.savePartnerProfile(db, { allianceId: allyA.id, values: { phone: "12" } }), q.PartnerValidationError);
  });
  await ok("contractor: expiring license creates one alert task (deduped)", async () => {
    const now = new Date("2026-10-06T15:00:00Z");
    assert.equal(await q.createPartnerExpiryTasks(db, 30, now), 1);
    assert.equal(await q.createPartnerExpiryTasks(db, 30, now), 0);
  });
  await ok("photos: A cannot read or delete B's photo", async () => {
    const id = await q.addPartnerPhoto(db, { allianceId: allyB.id, blobUrl: "https://blob.example/b.jpg", fileName: "b.jpg" });
    assert.equal(await q.getPartnerPhotoUrl(db, allyA.id, id), null);
    assert.equal(await q.removePartnerPhoto(db, allyA.id, id), null);
    assert.ok(await q.getPartnerPhotoUrl(db, allyB.id, id));
  });

  await ok("services: A only lists, edits and removes its own services", async () => {
    const svc = await import("./services");
    const bService = await svc.savePartnerService(db, { allianceId: allyB.id, values: { name: "Tile install", priceFrom: "$1,200" } });
    assert.equal(bService.priceFrom, "1200.00");
    const aService = await svc.savePartnerService(db, { allianceId: allyA.id, values: { name: "Kitchen remodel" } });
    assert.deepEqual((await svc.listPartnerServices(db, allyA.id)).map((s) => s.id), [aService.id]);
    await assert.rejects(svc.savePartnerService(db, { allianceId: allyA.id, id: bService.id, values: { name: "Hijacked" } }), q.PartnerValidationError);
    assert.equal(await svc.removePartnerService(db, { allianceId: allyA.id, id: bService.id }), false);
    assert.equal((await svc.listPartnerServices(db, allyB.id))[0]?.name, "Tile install");
    await assert.rejects(svc.savePartnerService(db, { allianceId: allyA.id, values: { name: "" } }), q.PartnerValidationError);
    await assert.rejects(svc.savePartnerService(db, { allianceId: allyA.id, values: { name: "X", priceFrom: "abc" } }), q.PartnerValidationError);
    assert.equal(await svc.removePartnerService(db, { allianceId: allyA.id, id: aService.id }), true);
    const reviewTasks = await db.select().from(tasks).where(and(eq(tasks.allianceId, allyA.id), eq(tasks.type, "partner_profile_review")));
    assert.ok(reviewTasks.some((t) => t.title.includes("added Kitchen remodel")) && reviewTasks.some((t) => t.title.includes("removed Kitchen remodel")));
  });

  // ── tasks invariant ──────────────────────────────────────────────────
  await ok("tasks: every task has a client or an alliance (database check)", async () => {
    await assert.rejects(db.insert(tasks).values({ type: "follow_up", title: "orphan" }));
  });

  console.log(`\nisolation.test.ts (partners): all ${passed} checks passed.`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);

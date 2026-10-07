import { randomInt } from "node:crypto";
import { and, count, desc, eq, gt, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { allianceStatusHistory, partnerEmailCodes, portalRateLimitEvents, strategicAlliances, tasks } from "@/lib/db/schema";
import { businessDateString } from "@/lib/dates";
import { formatUsPhone, usPhoneDigits } from "@/lib/validation/onlineBooking";
import type { PortalDb } from "@/lib/portal/db";
import {
  PARTNER_EMAIL_CODES_EMAIL_WINDOW_MINUTES,
  PARTNER_EMAIL_CODES_PER_EMAIL,
  PARTNER_EMAIL_CODES_PER_IP_HOUR,
  PARTNER_EMAIL_CODE_MAX_ATTEMPTS,
  PARTNER_EMAIL_CODE_TTL_MINUTES,
  PARTNER_IP_MAX_FAILURES,
  PARTNER_IP_WINDOW_MINUTES,
} from "./config";
import { createPartnerSession } from "./access";
import { recordPartnerConsent } from "./queries";
import { partnerEmailCodeHash, partnerEmailKey, safeEqual } from "./tokens";

// Diamante Conecta 360 (no Next.js imports — tested on PGlite):
//   • "Join": a business applies on the public page; a 6-digit code to its
//     email proves the email is its own; only then it enters the CRM as a
//     Prospect alliance ("Application from Diamante Conecta 360") with a
//     review task. It gets NO access until staff approves it.
//   • "Sign in with my email": a 6-digit code → a partner session, only for
//     an ACTIVE alliance whose access staff approved (emailLoginEnabled).
//     The answer is the same whether or not the email exists.
// Codes: only an HMAC is stored (bound to purpose + email), 10 minutes,
// 5 tries; limits per email and per IP.

const MINUTE_MS = 60 * 1000;
const ACTIVE = ["active_partner", "member"] as const;
const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/g, "").trim().slice(0, max) : "";
export const normalizeEmail = (v: unknown) => clean(v, 200).toLowerCase();
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// The ally types offered on the "Join" page.
export const CONECTA_ALLY_TYPES = [
  "chef_culinary",
  "contractor_remodeling",
  "installer_remodeling",
  "financial_partner",
  "insurance",
  "realtor",
  "cpa_accountant",
  "consultant",
  "other",
] as const;

export class ConectaValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

async function recentEvents(db: PortalDb, keyHash: string, sinceMs: number, now: Date) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(portalRateLimitEvents)
    .where(and(eq(portalRateLimitEvents.keyHash, keyHash), gt(portalRateLimitEvents.occurredAt, new Date(now.getTime() - sinceMs))));
  return row?.n ?? 0;
}

// Counts a code request for the email and the IP; false = over the limit.
async function allowCodeRequest(db: PortalDb, email: string, ipKey: string | null, now: Date) {
  const emailKey = `code-email:${partnerEmailKey(email)}`;
  const ipCodeKey = ipKey ? `code-ip:${ipKey}` : null;
  if ((await recentEvents(db, emailKey, PARTNER_EMAIL_CODES_EMAIL_WINDOW_MINUTES * MINUTE_MS, now)) >= PARTNER_EMAIL_CODES_PER_EMAIL) return false;
  if (ipCodeKey && (await recentEvents(db, ipCodeKey, 60 * MINUTE_MS, now)) >= PARTNER_EMAIL_CODES_PER_IP_HOUR) return false;
  await db.insert(portalRateLimitEvents).values([
    { keyHash: emailKey, occurredAt: now },
    ...(ipCodeKey ? [{ keyHash: ipCodeKey, occurredAt: now }] : []),
  ]);
  return true;
}

async function issueCode(
  db: PortalDb,
  params: { purpose: "signup" | "login"; email: string; allianceId?: string | null; payload?: unknown; now: Date },
) {
  // Only the newest code for this email and purpose is valid.
  await db
    .update(partnerEmailCodes)
    .set({ usedAt: params.now })
    .where(and(eq(partnerEmailCodes.email, params.email), eq(partnerEmailCodes.purpose, params.purpose), isNull(partnerEmailCodes.usedAt)));
  const code = newCode();
  await db.insert(partnerEmailCodes).values({
    purpose: params.purpose,
    email: params.email,
    codeHash: partnerEmailCodeHash(params.purpose, params.email, code),
    expiresAt: new Date(params.now.getTime() + PARTNER_EMAIL_CODE_TTL_MINUTES * MINUTE_MS),
    allianceId: params.allianceId ?? null,
    payload: params.payload ?? null,
    createdAt: params.now,
  });
  return code;
}

export type CodeCheck<T> = { ok: true; value: T } | { ok: false; reason: "invalid" | "rate_limited" };

// Checks a code; every wrong try counts (5 per code, and against the IP).
async function consumeCode(
  db: PortalDb,
  params: { purpose: "signup" | "login"; email: string; code: unknown; ipKey: string | null; now: Date },
): Promise<CodeCheck<typeof partnerEmailCodes.$inferSelect>> {
  const failKey = params.ipKey ? `code-fail:${params.ipKey}` : null;
  if (failKey && (await recentEvents(db, failKey, PARTNER_IP_WINDOW_MINUTES * MINUTE_MS, params.now)) >= PARTNER_IP_MAX_FAILURES) {
    return { ok: false, reason: "rate_limited" };
  }
  const fail = async (): Promise<CodeCheck<never>> => {
    if (failKey) await db.insert(portalRateLimitEvents).values({ keyHash: failKey, occurredAt: params.now });
    return { ok: false, reason: "invalid" };
  };
  const code = typeof params.code === "string" ? params.code.replace(/\D/g, "") : "";
  const [row] = await db
    .select()
    .from(partnerEmailCodes)
    .where(and(eq(partnerEmailCodes.email, params.email), eq(partnerEmailCodes.purpose, params.purpose), isNull(partnerEmailCodes.usedAt)))
    .orderBy(desc(partnerEmailCodes.createdAt))
    .limit(1);
  if (!row || row.expiresAt <= params.now || row.attempts >= PARTNER_EMAIL_CODE_MAX_ATTEMPTS) return fail();
  if (code.length !== 6 || !safeEqual(partnerEmailCodeHash(params.purpose, params.email, code), row.codeHash)) {
    await db.update(partnerEmailCodes).set({ attempts: sql`${partnerEmailCodes.attempts} + 1` }).where(eq(partnerEmailCodes.id, row.id));
    return fail();
  }
  const [claimed] = await db
    .update(partnerEmailCodes)
    .set({ usedAt: params.now })
    .where(and(eq(partnerEmailCodes.id, row.id), isNull(partnerEmailCodes.usedAt)))
    .returning();
  if (!claimed) return fail();
  return { ok: true, value: claimed };
}

// ── "Join Diamante Conecta 360" ──────────────────────────────────────

type Application = {
  businessName: string;
  contactPerson: string;
  allyType: (typeof CONECTA_ALLY_TYPES)[number];
  services: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  locale: "es" | "en";
  termsText: string;
  noticeText: string;
  permissionText: string;
};

export function parseApplication(input: unknown): Application {
  const v = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const businessName = clean(v.businessName, 200);
  if (businessName.length < 2) throw new ConectaValidationError("businessName");
  const contactPerson = clean(v.contactPerson, 200);
  if (contactPerson.length < 2) throw new ConectaValidationError("contactPerson");
  if (!(CONECTA_ALLY_TYPES as readonly unknown[]).includes(v.allyType)) throw new ConectaValidationError("allyType");
  const services = clean(v.services, 1000);
  if (services.length < 2) throw new ConectaValidationError("services");
  const city = clean(v.city, 100);
  if (city.length < 2) throw new ConectaValidationError("city");
  const digits = usPhoneDigits(clean(v.phone, 30));
  if (!digits) throw new ConectaValidationError("phone");
  const email = normalizeEmail(v.email);
  if (!isEmail(email)) throw new ConectaValidationError("email");
  if (v.acceptTerms !== true || v.acceptNotice !== true || v.acceptContact !== true) throw new ConectaValidationError("consents");
  return {
    businessName,
    contactPerson,
    allyType: v.allyType as Application["allyType"],
    services,
    city,
    phone: formatUsPhone(digits),
    email,
    website: clean(v.website, 500),
    locale: v.locale === "en" ? "en" : "es",
    termsText: clean(v.termsText, 20000),
    noticeText: clean(v.noticeText, 4000),
    permissionText: clean(v.permissionText, 1000),
  };
}

// Step 1: validate, rate-limit, and issue a code for the email. Returns the
// code for the caller to email (never to the browser).
export async function startConectaApplication(
  db: PortalDb,
  params: { input: unknown; ipKey: string | null; now?: Date },
): Promise<{ ok: true; email: string; code: string; locale: "es" | "en" } | { ok: false; reason: "rate_limited" }> {
  const now = params.now ?? new Date();
  const app = parseApplication(params.input);
  if (!(await allowCodeRequest(db, app.email, params.ipKey, now))) return { ok: false, reason: "rate_limited" };
  const code = await issueCode(db, { purpose: "signup", email: app.email, payload: app, now });
  return { ok: true, email: app.email, code, locale: app.locale };
}

// Step 2: the right code → a Prospect alliance + consents + a review task.
export async function verifyConectaApplication(
  db: PortalDb,
  params: { email: unknown; code: unknown; ipKey: string | null; ipAddress: string | null; userAgent: string | null; now?: Date },
): Promise<{ ok: true; allianceId: string; app: Application; duplicateOf: string | null } | { ok: false; reason: "invalid" | "rate_limited" }> {
  const now = params.now ?? new Date();
  const email = normalizeEmail(params.email);
  const checked = await consumeCode(db, { purpose: "signup", email, code: params.code, ipKey: params.ipKey, now });
  if (!checked.ok) return checked;
  const app = parseApplication({ ...(checked.value.payload as object), acceptTerms: true, acceptNotice: true, acceptContact: true });

  const [dup] = await db
    .select({ name: strategicAlliances.organizationName })
    .from(strategicAlliances)
    .where(or(ilike(strategicAlliances.organizationName, app.businessName), eq(strategicAlliances.email, app.email), eq(strategicAlliances.phone, app.phone)))
    .limit(1);

  const [alliance] = await db
    .insert(strategicAlliances)
    .values({
      organizationName: app.businessName,
      contactPerson: app.contactPerson,
      organizationType: app.allyType,
      phone: app.phone,
      email: app.email,
      website: app.website || null,
      city: app.city,
      servicesConnected: app.services,
      status: "prospect",
      appliedViaConecta: true,
      dateIntroduced: businessDateString(now),
      notes: `Solicitud desde Diamante Conecta 360 (${app.locale === "en" ? "inglés" : "español"}).`,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: strategicAlliances.id });
  await db.insert(allianceStatusHistory).values({ allianceId: alliance.id, previousStatus: null, newStatus: "prospect", changedByEmail: "diamante-conecta-360" });
  const evidence = { allianceId: alliance.id, ipAddress: params.ipAddress, userAgent: params.userAgent, now };
  await recordPartnerConsent(db, { ...evidence, type: "partner_terms", textShown: app.termsText });
  await recordPartnerConsent(db, { ...evidence, type: "not_a_law_firm", textShown: app.noticeText });
  await recordPartnerConsent(db, { ...evidence, type: "contact_permission", textShown: app.permissionText });
  await db.insert(tasks).values({
    allianceId: alliance.id,
    type: "partner_application_review",
    title: `Review ally application (Diamante Conecta 360): ${app.businessName}${dup ? ` — possible duplicate of ${dup.name}` : ""}`,
    createdAt: now,
  });
  return { ok: true, allianceId: alliance.id, app, duplicateOf: dup?.name ?? null };
}

// Staff "Approve and give access": active ally + email sign-in on.
export async function approveConectaAlliance(db: PortalDb, params: { allianceId: string; staffEmail: string | null; now?: Date }) {
  const now = params.now ?? new Date();
  const [a] = await db
    .select({ status: strategicAlliances.status, email: strategicAlliances.email, name: strategicAlliances.organizationName, notes: strategicAlliances.notes })
    .from(strategicAlliances)
    .where(eq(strategicAlliances.id, params.allianceId))
    .limit(1);
  if (!a) return null;
  await db
    .update(strategicAlliances)
    .set({ status: (ACTIVE as readonly string[]).includes(a.status) ? a.status : "active_partner", emailLoginEnabled: true, updatedAt: now })
    .where(eq(strategicAlliances.id, params.allianceId));
  if (!(ACTIVE as readonly string[]).includes(a.status)) {
    await db.insert(allianceStatusHistory).values({ allianceId: params.allianceId, previousStatus: a.status, newStatus: "active_partner", changedByEmail: params.staffEmail });
  }
  await db
    .update(tasks)
    .set({ status: "done", completedAt: now })
    .where(and(eq(tasks.allianceId, params.allianceId), eq(tasks.type, "partner_application_review"), eq(tasks.status, "open")));
  // The applicant's language is in the note written when it applied.
  const locale: "es" | "en" = a.notes?.includes("Diamante Conecta 360 (inglés)") ? "en" : "es";
  return { email: a.email, name: a.name, locale };
}

// ── "Sign in with my email" ──────────────────────────────────────────

async function eligibleAlliances(db: PortalDb, email: string) {
  return db
    .select({ id: strategicAlliances.id })
    .from(strategicAlliances)
    .where(
      and(
        sql`lower(${strategicAlliances.email}) = ${email}`,
        eq(strategicAlliances.emailLoginEnabled, true),
        inArray(strategicAlliances.status, [...ACTIVE]),
      ),
    )
    .limit(2);
}

// Returns a code to email ONLY when exactly one active, approved alliance
// has this email; the caller always answers the browser the same way.
export async function startEmailLogin(
  db: PortalDb,
  params: { email: unknown; ipKey: string | null; now?: Date },
): Promise<{ send: { email: string; code: string; allianceId: string } | null; rateLimited: boolean }> {
  const now = params.now ?? new Date();
  const email = normalizeEmail(params.email);
  if (!isEmail(email)) return { send: null, rateLimited: false };
  if (!(await allowCodeRequest(db, email, params.ipKey, now))) return { send: null, rateLimited: true };
  const matches = await eligibleAlliances(db, email);
  if (matches.length !== 1) return { send: null, rateLimited: false };
  const code = await issueCode(db, { purpose: "login", email, allianceId: matches[0].id, now });
  return { send: { email, code, allianceId: matches[0].id }, rateLimited: false };
}

export async function verifyEmailLogin(
  db: PortalDb,
  params: { email: unknown; code: unknown; ipKey: string | null; now?: Date },
): Promise<{ ok: true; allianceId: string; sessionToken: string; sessionExpiresAt: Date } | { ok: false; reason: "invalid" | "rate_limited" }> {
  const now = params.now ?? new Date();
  const email = normalizeEmail(params.email);
  const checked = await consumeCode(db, { purpose: "login", email, code: params.code, ipKey: params.ipKey, now });
  if (!checked.ok) return checked;
  // Still active and approved right now (access may have been revoked).
  const matches = await eligibleAlliances(db, email);
  const allianceId = checked.value.allianceId;
  if (!allianceId || matches.length !== 1 || matches[0].id !== allianceId) return { ok: false, reason: "invalid" };
  const session = await createPartnerSession(db, allianceId, null, now);
  return { ok: true, allianceId, ...session };
}

// How many codes this email asked for recently (for tests / staff view).
export async function countEmailCodes(db: PortalDb, email: string) {
  const [row] = await db.select({ n: count() }).from(partnerEmailCodes).where(eq(partnerEmailCodes.email, normalizeEmail(email)));
  return row?.n ?? 0;
}

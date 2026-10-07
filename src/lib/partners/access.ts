import { and, desc, eq, gt, isNull, lt, max, sql } from "drizzle-orm";
import {
  partnerAccessLinks,
  partnerSessions,
  portalRateLimitEvents,
  strategicAlliances,
} from "@/lib/db/schema";
import type { PortalDb } from "@/lib/portal/db";
import {
  PARTNER_IP_MAX_FAILURES,
  PARTNER_IP_WINDOW_MINUTES,
  PARTNER_LAST_SEEN_REFRESH_MINUTES,
  PARTNER_LINK_TTL_DAYS,
  PARTNER_MAX_LINK_ATTEMPTS,
  PARTNER_SESSION_TTL_DAYS,
} from "./config";
import {
  generatePartnerToken,
  hashPartnerToken,
  isWellFormedPartnerToken,
  lastFourDigits,
  partnerLast4Hash,
  safeEqual,
} from "./tokens";

// Partner portal access — one access per ALLIANCE (owner's decision),
// confirmed with the last 4 digits of the alliance's phone. Same rules as
// the client portal (src/lib/portal/access.ts): single-use links that
// expire in 7 days, a lock after 5 wrong answers, per-IP limits, 30-day
// sessions stored only as hashes. No Next.js imports (tested on PGlite).

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export class PartnerAccessError extends Error {}

export async function createPartnerAccessLink(
  db: PortalDb,
  params: { allianceId: string; createdByEmail: string | null; now?: Date },
): Promise<{ token: string; expiresAt: Date }> {
  const now = params.now ?? new Date();
  const [alliance] = await db
    .select({ phone: strategicAlliances.phone, status: strategicAlliances.status, addedBy: strategicAlliances.addedByAllianceId })
    .from(strategicAlliances)
    .where(eq(strategicAlliances.id, params.allianceId))
    .limit(1);
  if (!alliance) throw new PartnerAccessError("Alliance not found");
  // A business another ally added (Phase B) gets portal access only after
  // staff converts it into an active AMS ally.
  if (alliance.addedBy && alliance.status !== "active_partner" && alliance.status !== "member") {
    throw new PartnerAccessError("Alliance is not active yet");
  }
  const lastFour = lastFourDigits(alliance.phone);
  if (!lastFour) throw new PartnerAccessError("Alliance has no phone number");
  // Giving access approves it: "Sign in with my email" works too (when the
  // alliance has an email).
  await db.update(strategicAlliances).set({ emailLoginEnabled: true }).where(eq(strategicAlliances.id, params.allianceId));

  await db
    .update(partnerAccessLinks)
    .set({ revokedAt: now })
    .where(
      and(
        eq(partnerAccessLinks.allianceId, params.allianceId),
        isNull(partnerAccessLinks.usedAt),
        isNull(partnerAccessLinks.revokedAt),
      ),
    );

  const token = generatePartnerToken();
  const expiresAt = new Date(now.getTime() + PARTNER_LINK_TTL_DAYS * DAY_MS);
  await db.insert(partnerAccessLinks).values({
    allianceId: params.allianceId,
    tokenHash: hashPartnerToken(token),
    expiresAt,
    createdAt: now,
    createdByEmail: params.createdByEmail,
    phoneLast4Hash: partnerLast4Hash(params.allianceId, lastFour),
  });
  return { token, expiresAt };
}

export async function revokePartnerAccess(db: PortalDb, allianceId: string, now = new Date()) {
  // Also turns off "Sign in with my email".
  await db.update(strategicAlliances).set({ emailLoginEnabled: false }).where(eq(strategicAlliances.id, allianceId));
  await db
    .update(partnerAccessLinks)
    .set({ revokedAt: now })
    .where(and(eq(partnerAccessLinks.allianceId, allianceId), isNull(partnerAccessLinks.revokedAt)));
  await db
    .update(partnerSessions)
    .set({ revokedAt: now })
    .where(and(eq(partnerSessions.allianceId, allianceId), isNull(partnerSessions.revokedAt)));
}

async function countRecentIpFailures(db: PortalDb, ipKey: string, now: Date) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(portalRateLimitEvents)
    .where(
      and(
        eq(portalRateLimitEvents.keyHash, ipKey),
        gt(portalRateLimitEvents.occurredAt, new Date(now.getTime() - PARTNER_IP_WINDOW_MINUTES * MINUTE_MS)),
      ),
    );
  return row?.n ?? 0;
}

export type PartnerRedeemResult =
  | { ok: true; allianceId: string; sessionToken: string; sessionExpiresAt: Date }
  | { ok: false; reason: "invalid" | "locked" | "rate_limited" };

export async function redeemPartnerAccessLink(
  db: PortalDb,
  params: { token: unknown; lastFour: unknown; ipKey: string | null; now?: Date },
): Promise<PartnerRedeemResult> {
  const now = params.now ?? new Date();
  if (params.ipKey && (await countRecentIpFailures(db, params.ipKey, now)) >= PARTNER_IP_MAX_FAILURES) {
    return { ok: false, reason: "rate_limited" };
  }
  const fail = async (reason: "invalid" | "locked" = "invalid"): Promise<PartnerRedeemResult> => {
    if (params.ipKey) await db.insert(portalRateLimitEvents).values({ keyHash: params.ipKey, occurredAt: now });
    return { ok: false, reason };
  };

  if (!isWellFormedPartnerToken(params.token)) return fail();
  const lastFour = typeof params.lastFour === "string" ? params.lastFour.replace(/\D/g, "") : "";

  const [link] = await db
    .select({
      id: partnerAccessLinks.id,
      allianceId: partnerAccessLinks.allianceId,
      expiresAt: partnerAccessLinks.expiresAt,
      usedAt: partnerAccessLinks.usedAt,
      revokedAt: partnerAccessLinks.revokedAt,
      failedAttempts: partnerAccessLinks.failedAttempts,
      phoneLast4Hash: partnerAccessLinks.phoneLast4Hash,
    })
    .from(partnerAccessLinks)
    .where(eq(partnerAccessLinks.tokenHash, hashPartnerToken(params.token)))
    .limit(1);

  if (!link || link.usedAt || link.revokedAt || link.expiresAt <= now) return fail();
  if (link.failedAttempts >= PARTNER_MAX_LINK_ATTEMPTS) return fail("locked");

  if (lastFour.length !== 4 || !safeEqual(partnerLast4Hash(link.allianceId, lastFour), link.phoneLast4Hash)) {
    const [updated] = await db
      .update(partnerAccessLinks)
      .set({ failedAttempts: sql`${partnerAccessLinks.failedAttempts} + 1` })
      .where(eq(partnerAccessLinks.id, link.id))
      .returning({ failedAttempts: partnerAccessLinks.failedAttempts });
    return fail((updated?.failedAttempts ?? 0) >= PARTNER_MAX_LINK_ATTEMPTS ? "locked" : "invalid");
  }

  const [claimed] = await db
    .update(partnerAccessLinks)
    .set({ usedAt: now })
    .where(
      and(
        eq(partnerAccessLinks.id, link.id),
        isNull(partnerAccessLinks.usedAt),
        isNull(partnerAccessLinks.revokedAt),
        gt(partnerAccessLinks.expiresAt, now),
        lt(partnerAccessLinks.failedAttempts, PARTNER_MAX_LINK_ATTEMPTS),
      ),
    )
    .returning({ id: partnerAccessLinks.id });
  if (!claimed) return fail();

  const { sessionToken, sessionExpiresAt } = await createPartnerSession(db, link.allianceId, link.id, now);
  return { ok: true, allianceId: link.allianceId, sessionToken, sessionExpiresAt };
}

// A new partner session (personal link, or Diamante Conecta 360's
// "Sign in with my email"). Only the token's hash is stored.
export async function createPartnerSession(db: PortalDb, allianceId: string, linkId: string | null, now = new Date()) {
  const sessionToken = generatePartnerToken();
  const sessionExpiresAt = new Date(now.getTime() + PARTNER_SESSION_TTL_DAYS * DAY_MS);
  await db.insert(partnerSessions).values({
    allianceId,
    linkId,
    tokenHash: hashPartnerToken(sessionToken),
    expiresAt: sessionExpiresAt,
    createdAt: now,
    lastSeenAt: now,
  });
  return { sessionToken, sessionExpiresAt };
}

export type ResolvedPartnerSession = { sessionId: string; allianceId: string; expiresAt: Date };

// The ONLY way partner-portal code learns which alliance it acts for.
export async function resolvePartnerSession(
  db: PortalDb,
  sessionToken: unknown,
  now = new Date(),
): Promise<ResolvedPartnerSession | null> {
  if (!isWellFormedPartnerToken(sessionToken)) return null;
  const [session] = await db
    .select({
      id: partnerSessions.id,
      allianceId: partnerSessions.allianceId,
      expiresAt: partnerSessions.expiresAt,
      lastSeenAt: partnerSessions.lastSeenAt,
    })
    .from(partnerSessions)
    .where(
      and(
        eq(partnerSessions.tokenHash, hashPartnerToken(sessionToken)),
        isNull(partnerSessions.revokedAt),
        gt(partnerSessions.expiresAt, now),
      ),
    )
    .limit(1);
  if (!session) return null;
  if (now.getTime() - session.lastSeenAt.getTime() > PARTNER_LAST_SEEN_REFRESH_MINUTES * MINUTE_MS) {
    await db.update(partnerSessions).set({ lastSeenAt: now }).where(eq(partnerSessions.id, session.id));
  }
  return { sessionId: session.id, allianceId: session.allianceId, expiresAt: session.expiresAt };
}

export async function endPartnerSession(db: PortalDb, sessionToken: unknown, now = new Date()) {
  if (!isWellFormedPartnerToken(sessionToken)) return;
  await db
    .update(partnerSessions)
    .set({ revokedAt: now })
    .where(eq(partnerSessions.tokenHash, hashPartnerToken(sessionToken)));
}

// For the staff-side "Partner portal access" card on the alliance record.
export async function getPartnerAccessSummary(db: PortalDb, allianceId: string, now = new Date()) {
  const [pendingLink] = await db
    .select({
      createdAt: partnerAccessLinks.createdAt,
      expiresAt: partnerAccessLinks.expiresAt,
      failedAttempts: partnerAccessLinks.failedAttempts,
    })
    .from(partnerAccessLinks)
    .where(
      and(
        eq(partnerAccessLinks.allianceId, allianceId),
        isNull(partnerAccessLinks.usedAt),
        isNull(partnerAccessLinks.revokedAt),
        gt(partnerAccessLinks.expiresAt, now),
      ),
    )
    .orderBy(desc(partnerAccessLinks.createdAt))
    .limit(1);
  const [sessions] = await db
    .select({
      active: sql<number>`count(*) filter (where ${partnerSessions.revokedAt} is null and ${partnerSessions.expiresAt} > ${now})::int`,
      lastSeenAt: max(partnerSessions.lastSeenAt),
      lastLoginAt: max(partnerSessions.createdAt),
    })
    .from(partnerSessions)
    .where(eq(partnerSessions.allianceId, allianceId));
  return {
    pendingLink: pendingLink ? { ...pendingLink, locked: pendingLink.failedAttempts >= PARTNER_MAX_LINK_ATTEMPTS } : null,
    activeSessions: sessions?.active ?? 0,
    lastSeenAt: sessions?.lastSeenAt ?? null,
    lastLoginAt: sessions?.lastLoginAt ?? null,
  };
}

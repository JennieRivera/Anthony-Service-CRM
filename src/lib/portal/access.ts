import { and, desc, eq, gt, isNull, lt, max, sql } from "drizzle-orm";
import {
  clients,
  portalAccessLinks,
  portalRateLimitEvents,
  portalSessions,
} from "@/lib/db/schema";
import type { PortalDb } from "./db";
import {
  PORTAL_IP_MAX_FAILURES,
  PORTAL_IP_WINDOW_MINUTES,
  PORTAL_LAST_SEEN_REFRESH_MINUTES,
  PORTAL_LINK_TTL_DAYS,
  PORTAL_MAX_LINK_ATTEMPTS,
  PORTAL_SESSION_TTL_DAYS,
} from "./config";
import {
  generatePortalToken,
  hashPortalToken,
  isWellFormedPortalToken,
  lastFourDigits,
  safeEqual,
} from "./tokens";

// Client portal access: personal links (staff → client by WhatsApp) and
// the portal sessions they create. No Next.js imports here — the database
// is always passed in (see db.ts), so isolation.test.ts runs this exact
// code against PGlite.

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export class PortalAccessError extends Error {}

// Creates a new single-use link for the client and revokes any of their
// earlier links that were never used (existing sessions are kept). Returns
// the raw token — the only time it exists outside the client's browser.
export async function createPortalAccessLink(
  db: PortalDb,
  params: { clientId: string; createdByEmail: string | null; now?: Date },
): Promise<{ token: string; expiresAt: Date }> {
  const now = params.now ?? new Date();
  const [client] = await db
    .select({ phone: clients.phone })
    .from(clients)
    .where(eq(clients.id, params.clientId))
    .limit(1);
  if (!client) throw new PortalAccessError("Client not found");
  // The link is confirmed with the last 4 digits of this phone.
  if (!lastFourDigits(client.phone)) throw new PortalAccessError("Client has no phone number");

  await db
    .update(portalAccessLinks)
    .set({ revokedAt: now })
    .where(
      and(
        eq(portalAccessLinks.clientId, params.clientId),
        isNull(portalAccessLinks.usedAt),
        isNull(portalAccessLinks.revokedAt),
      ),
    );

  const token = generatePortalToken();
  const expiresAt = new Date(now.getTime() + PORTAL_LINK_TTL_DAYS * DAY_MS);
  await db.insert(portalAccessLinks).values({
    clientId: params.clientId,
    tokenHash: hashPortalToken(token),
    expiresAt,
    createdAt: now,
    createdByEmail: params.createdByEmail,
  });
  return { token, expiresAt };
}

// Revokes every unused link AND every session for the client.
export async function revokePortalAccess(db: PortalDb, clientId: string, now = new Date()) {
  await db
    .update(portalAccessLinks)
    .set({ revokedAt: now })
    .where(and(eq(portalAccessLinks.clientId, clientId), isNull(portalAccessLinks.revokedAt)));
  await db
    .update(portalSessions)
    .set({ revokedAt: now })
    .where(and(eq(portalSessions.clientId, clientId), isNull(portalSessions.revokedAt)));
}

export async function countRecentIpFailures(db: PortalDb, ipKey: string, now = new Date()) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(portalRateLimitEvents)
    .where(
      and(
        eq(portalRateLimitEvents.keyHash, ipKey),
        gt(portalRateLimitEvents.occurredAt, new Date(now.getTime() - PORTAL_IP_WINDOW_MINUTES * MINUTE_MS)),
      ),
    );
  return row?.n ?? 0;
}

export type RedeemResult =
  | { ok: true; clientId: string; sessionToken: string; sessionExpiresAt: Date; linkId: string }
  | { ok: false; reason: "invalid" | "locked" | "rate_limited" };

// Exchanges a link token + the last 4 phone digits for a new portal
// session. Every failure looks the same to the caller ("invalid") except
// a locked link or an IP that is over the limit. Single-use is enforced by
// a conditional UPDATE (… WHERE used_at IS NULL …) — one statement, so two
// simultaneous redemptions can't both succeed.
export async function redeemPortalAccessLink(
  db: PortalDb,
  params: { token: unknown; lastFour: unknown; ipKey: string | null; now?: Date },
): Promise<RedeemResult> {
  const now = params.now ?? new Date();

  if (params.ipKey && (await countRecentIpFailures(db, params.ipKey, now)) >= PORTAL_IP_MAX_FAILURES) {
    return { ok: false, reason: "rate_limited" };
  }
  const fail = async (reason: "invalid" | "locked" = "invalid"): Promise<RedeemResult> => {
    if (params.ipKey) await db.insert(portalRateLimitEvents).values({ keyHash: params.ipKey, occurredAt: now });
    return { ok: false, reason };
  };

  if (!isWellFormedPortalToken(params.token)) return fail();
  const lastFour = typeof params.lastFour === "string" ? params.lastFour.replace(/\D/g, "") : "";

  const [link] = await db
    .select({
      id: portalAccessLinks.id,
      clientId: portalAccessLinks.clientId,
      expiresAt: portalAccessLinks.expiresAt,
      usedAt: portalAccessLinks.usedAt,
      revokedAt: portalAccessLinks.revokedAt,
      failedAttempts: portalAccessLinks.failedAttempts,
      phone: clients.phone,
    })
    .from(portalAccessLinks)
    .innerJoin(clients, eq(clients.id, portalAccessLinks.clientId))
    .where(eq(portalAccessLinks.tokenHash, hashPortalToken(params.token)))
    .limit(1);

  if (!link || link.usedAt || link.revokedAt || link.expiresAt <= now) return fail();
  if (link.failedAttempts >= PORTAL_MAX_LINK_ATTEMPTS) return fail("locked");

  const expected = lastFourDigits(link.phone);
  if (!expected || lastFour.length !== 4 || !safeEqual(lastFour, expected)) {
    const [updated] = await db
      .update(portalAccessLinks)
      .set({ failedAttempts: sql`${portalAccessLinks.failedAttempts} + 1` })
      .where(eq(portalAccessLinks.id, link.id))
      .returning({ failedAttempts: portalAccessLinks.failedAttempts });
    return fail((updated?.failedAttempts ?? 0) >= PORTAL_MAX_LINK_ATTEMPTS ? "locked" : "invalid");
  }

  const [claimed] = await db
    .update(portalAccessLinks)
    .set({ usedAt: now })
    .where(
      and(
        eq(portalAccessLinks.id, link.id),
        isNull(portalAccessLinks.usedAt),
        isNull(portalAccessLinks.revokedAt),
        gt(portalAccessLinks.expiresAt, now),
        lt(portalAccessLinks.failedAttempts, PORTAL_MAX_LINK_ATTEMPTS),
      ),
    )
    .returning({ id: portalAccessLinks.id });
  if (!claimed) return fail();

  const sessionToken = generatePortalToken();
  const sessionExpiresAt = new Date(now.getTime() + PORTAL_SESSION_TTL_DAYS * DAY_MS);
  await db.insert(portalSessions).values({
    clientId: link.clientId,
    linkId: link.id,
    tokenHash: hashPortalToken(sessionToken),
    expiresAt: sessionExpiresAt,
    createdAt: now,
    lastSeenAt: now,
  });
  return { ok: true, clientId: link.clientId, sessionToken, sessionExpiresAt, linkId: link.id };
}

export type ResolvedPortalSession = { sessionId: string; clientId: string; expiresAt: Date };

// The ONLY way portal code learns which client it's acting for.
export async function resolvePortalSession(
  db: PortalDb,
  sessionToken: unknown,
  now = new Date(),
): Promise<ResolvedPortalSession | null> {
  if (!isWellFormedPortalToken(sessionToken)) return null;
  const [session] = await db
    .select({
      id: portalSessions.id,
      clientId: portalSessions.clientId,
      expiresAt: portalSessions.expiresAt,
      lastSeenAt: portalSessions.lastSeenAt,
    })
    .from(portalSessions)
    .where(
      and(
        eq(portalSessions.tokenHash, hashPortalToken(sessionToken)),
        isNull(portalSessions.revokedAt),
        gt(portalSessions.expiresAt, now),
      ),
    )
    .limit(1);
  if (!session) return null;

  if (now.getTime() - session.lastSeenAt.getTime() > PORTAL_LAST_SEEN_REFRESH_MINUTES * MINUTE_MS) {
    await db.update(portalSessions).set({ lastSeenAt: now }).where(eq(portalSessions.id, session.id));
  }
  return { sessionId: session.id, clientId: session.clientId, expiresAt: session.expiresAt };
}

export async function endPortalSession(db: PortalDb, sessionToken: unknown, now = new Date()) {
  if (!isWellFormedPortalToken(sessionToken)) return;
  await db
    .update(portalSessions)
    .set({ revokedAt: now })
    .where(eq(portalSessions.tokenHash, hashPortalToken(sessionToken)));
}

// For the staff-side "Portal access" card on the client record.
export async function getPortalAccessSummary(db: PortalDb, clientId: string, now = new Date()) {
  const [pendingLink] = await db
    .select({ createdAt: portalAccessLinks.createdAt, expiresAt: portalAccessLinks.expiresAt, failedAttempts: portalAccessLinks.failedAttempts })
    .from(portalAccessLinks)
    .where(
      and(
        eq(portalAccessLinks.clientId, clientId),
        isNull(portalAccessLinks.usedAt),
        isNull(portalAccessLinks.revokedAt),
        gt(portalAccessLinks.expiresAt, now),
      ),
    )
    .orderBy(desc(portalAccessLinks.createdAt))
    .limit(1);

  const [sessions] = await db
    .select({
      active: sql<number>`count(*) filter (where ${portalSessions.revokedAt} is null and ${portalSessions.expiresAt} > ${now})::int`,
      lastSeenAt: max(portalSessions.lastSeenAt),
      lastLoginAt: max(portalSessions.createdAt),
    })
    .from(portalSessions)
    .where(eq(portalSessions.clientId, clientId));

  return {
    pendingLink: pendingLink
      ? { ...pendingLink, locked: pendingLink.failedAttempts >= PORTAL_MAX_LINK_ATTEMPTS }
      : null,
    activeSessions: sessions?.active ?? 0,
    lastSeenAt: sessions?.lastSeenAt ?? null,
    lastLoginAt: sessions?.lastLoginAt ?? null,
  };
}

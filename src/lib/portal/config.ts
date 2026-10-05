// Client portal (Step 2A) — limits approved by the owner on 2026-10-04.

export const PORTAL_LINK_TTL_DAYS = 7;
export const PORTAL_SESSION_TTL_DAYS = 30;

// Wrong last-4-digit answers before a link locks itself for good.
export const PORTAL_MAX_LINK_ATTEMPTS = 5;

// Failed sign-in attempts allowed per IP in the window below (any token).
export const PORTAL_IP_MAX_FAILURES = 10;
export const PORTAL_IP_WINDOW_MINUTES = 15;

// How often lastSeenAt is refreshed on an active session.
export const PORTAL_LAST_SEEN_REFRESH_MINUTES = 5;

export const PORTAL_SESSION_COOKIE = "ams_portal";

export const PORTAL_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
// Uploads one client may complete per rolling 24 hours (abuse guard).
export const PORTAL_MAX_UPLOADS_PER_DAY = 40;

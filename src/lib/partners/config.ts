// Partner (alliance) portal, Phase A — same limits as the client portal.

export const PARTNER_LINK_TTL_DAYS = 7;
export const PARTNER_SESSION_TTL_DAYS = 30;
export const PARTNER_MAX_LINK_ATTEMPTS = 5;
export const PARTNER_IP_MAX_FAILURES = 10;
export const PARTNER_IP_WINDOW_MINUTES = 15;
export const PARTNER_LAST_SEEN_REFRESH_MINUTES = 5;

// Its own cookie: never the client portal's, never Auth.js.
export const PARTNER_SESSION_COOKIE = "ams_partner";

export const PARTNER_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const PARTNER_MAX_UPLOADS_PER_DAY = 40;
export const PARTNER_MAX_PHOTOS = 12;
export const PARTNER_MAX_REFERRALS_PER_DAY = 20;
export const PARTNER_MAX_PROFILE_CHANGES_PER_DAY = 10;
export const PARTNER_MAX_SERVICES = 30;
export const PARTNER_MAX_MEETING_REQUESTS_PER_DAY = 5;

// Diamante Conecta 360 — 6-digit email codes ("Join" and "Sign in with my
// email"): 10 minutes, 5 tries; at most 5 codes per email every 15 minutes
// (approving an application starts that count over) and 10 per IP per hour.
export const PARTNER_EMAIL_CODE_TTL_MINUTES = 10;
export const PARTNER_EMAIL_CODE_MAX_ATTEMPTS = 5;
export const PARTNER_EMAIL_CODES_PER_EMAIL = 5;
export const PARTNER_EMAIL_CODES_EMAIL_WINDOW_MINUTES = 15;
export const PARTNER_EMAIL_CODES_PER_IP_HOUR = 10;

// Contractor license / insurance: alert staff this many days before.
export const PARTNER_EXPIRY_ALERT_DAYS = 30;

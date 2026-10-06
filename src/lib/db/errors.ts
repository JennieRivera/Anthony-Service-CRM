// Drizzle wraps driver errors in a DrizzleQueryError whose `cause` is the
// Postgres error — so the SQLSTATE code may be on the error itself or on
// its cause. Checking only `error.code` misses it (that's how a blocked
// client delete became a 500 instead of a friendly message).
export function dbErrorCode(error: unknown): string | null {
  for (let e: unknown = error, depth = 0; e && typeof e === "object" && depth < 4; e = (e as { cause?: unknown }).cause, depth++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return null;
}

// A row is still referenced by another table (RESTRICT or NO ACTION).
export function isForeignKeyBlock(error: unknown): boolean {
  const code = dbErrorCode(error);
  return code === "23503" || code === "23001";
}

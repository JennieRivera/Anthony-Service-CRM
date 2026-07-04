export function isBlobConfigured() {
  // Vercel Blob can authenticate either via a static BLOB_READ_WRITE_TOKEN,
  // or via OIDC (BLOB_STORE_ID + the auto-refreshed VERCEL_OIDC_TOKEN),
  // which is what a store connected through the Vercel dashboard uses today.
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  );
}

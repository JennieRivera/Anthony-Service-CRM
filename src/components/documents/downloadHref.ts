// Vercel Blob serves public URLs with an inline Content-Disposition for
// browser-viewable types (PDF, images), so the HTML `download` attribute
// alone doesn't force a save — it's silently ignored on a cross-origin link.
// `?download=1` makes Blob itself send Content-Disposition: attachment,
// which works regardless of origin. Same param @vercel/blob's own
// getDownloadUrl() sets; reimplemented locally to avoid pulling the Blob
// client SDK into the browser bundle for one query-string tweak.
export function downloadHref(blobUrl: string): string {
  const url = new URL(blobUrl);
  url.searchParams.set("download", "1");
  return url.toString();
}

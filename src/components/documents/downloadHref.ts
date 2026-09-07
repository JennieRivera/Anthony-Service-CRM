// Documents live in a private Blob store (notary/immigration/tax files),
// so there is no public Blob URL to link to — every read goes through our
// own authenticated route, which streams the file and, for downloadHref,
// sets Content-Disposition: attachment so the browser saves rather than
// opens it inline.
export function viewHref(documentId: string): string {
  return `/api/documents/${documentId}/file`;
}

export function downloadHref(documentId: string): string {
  return `/api/documents/${documentId}/file?download=1`;
}

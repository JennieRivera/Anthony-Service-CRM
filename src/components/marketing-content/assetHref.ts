export function assetViewHref(assetId: string): string {
  return `/api/marketing-content/${assetId}/file`;
}

export function assetDownloadHref(assetId: string): string {
  return `/api/marketing-content/${assetId}/file?download=1`;
}

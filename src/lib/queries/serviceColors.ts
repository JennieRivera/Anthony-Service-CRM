import { getDb } from "@/lib/db";
import { serviceColorSettings } from "@/lib/db/schema";

export async function listServiceColorSettings() {
  return getDb()
    .select()
    .from(serviceColorSettings)
    .orderBy(serviceColorSettings.sortOrder);
}

// Convenience shape for anything that just needs "key -> hex" (the
// calendar's eventPropGetter, the legend) without the extra columns.
export async function getServiceColorMap(): Promise<Record<string, string>> {
  const rows = await listServiceColorSettings();
  return Object.fromEntries(rows.map((r) => [r.key, r.colorHex]));
}

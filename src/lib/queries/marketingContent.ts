import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { marketingContentAssets, marketingAssetPartnerShares } from "@/lib/db/schema";

export async function listMarketingContentAssets() {
  return getDb()
    .select()
    .from(marketingContentAssets)
    .orderBy(desc(marketingContentAssets.publishedDate), desc(marketingContentAssets.createdAt));
}

// Partner portal: which alliances each "selected"-shared asset goes to.
export async function listMarketingPartnerShares() {
  return getDb().select().from(marketingAssetPartnerShares);
}

export async function getMarketingContentAssetById(id: string) {
  const [row] = await getDb()
    .select()
    .from(marketingContentAssets)
    .where(eq(marketingContentAssets.id, id));
  return row ?? null;
}

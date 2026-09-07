import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { marketingContentAssets } from "@/lib/db/schema";

export async function listMarketingContentAssets() {
  return getDb()
    .select()
    .from(marketingContentAssets)
    .orderBy(desc(marketingContentAssets.publishedDate), desc(marketingContentAssets.createdAt));
}

export async function getMarketingContentAssetById(id: string) {
  const [row] = await getDb()
    .select()
    .from(marketingContentAssets)
    .where(eq(marketingContentAssets.id, id));
  return row ?? null;
}

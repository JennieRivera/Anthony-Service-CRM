import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { socialMediaContent, marketingContentAssets } from "@/lib/db/schema";

export async function listSocialMediaContent() {
  return getDb()
    .select({
      content: socialMediaContent,
      mediaFileName: marketingContentAssets.fileName,
    })
    .from(socialMediaContent)
    .leftJoin(
      marketingContentAssets,
      eq(socialMediaContent.mediaAssetId, marketingContentAssets.id),
    )
    .orderBy(desc(socialMediaContent.createdAt));
}

export async function getSocialMediaContentById(id: string) {
  const [row] = await getDb()
    .select({
      content: socialMediaContent,
      mediaFileName: marketingContentAssets.fileName,
      mediaAssetIdRef: marketingContentAssets.id,
    })
    .from(socialMediaContent)
    .leftJoin(
      marketingContentAssets,
      eq(socialMediaContent.mediaAssetId, marketingContentAssets.id),
    )
    .where(eq(socialMediaContent.id, id))
    .limit(1);

  return row ?? null;
}

// Feeds the content form's Media Library picker — reuses the existing
// asset library rather than a second upload flow (section 4).
export async function listMarketingContentAssetsForSelect() {
  return getDb()
    .select({
      id: marketingContentAssets.id,
      fileName: marketingContentAssets.fileName,
    })
    .from(marketingContentAssets)
    .orderBy(desc(marketingContentAssets.createdAt));
}

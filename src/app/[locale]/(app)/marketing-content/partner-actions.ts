"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { marketingAssetPartnerShares, marketingContentAssets, strategicAlliances } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { requireAuthenticatedUser } from "@/lib/permissions";

// Marketing Content × partner portal: approve/reject material an alliance
// submitted, and choose which partners can download a material (none, all,
// or selected alliances).

export async function setMarketingApprovalAction(assetId: string, status: "approved" | "rejected") {
  await requireAuthenticatedUser();
  const parsed = z.object({ assetId: z.string().uuid(), status: z.enum(["approved", "rejected"]) }).parse({ assetId, status });
  const [asset] = await getDb()
    .update(marketingContentAssets)
    .set({ approvalStatus: parsed.status })
    .where(eq(marketingContentAssets.id, parsed.assetId))
    .returning({ fileName: marketingContentAssets.fileName });
  if (!asset) return;
  await logAuditEvent({
    action: "marketing.partner_submission_reviewed",
    entityType: "marketing_content_asset",
    entityId: parsed.assetId,
    summary: `Partner marketing material "${asset.fileName}" ${parsed.status}`,
  });
  revalidatePath("/marketing-content");
}

export async function setMarketingPartnerShareAction(assetId: string, share: "none" | "all" | "selected", allianceIds: string[]) {
  await requireAuthenticatedUser();
  const parsed = z
    .object({
      assetId: z.string().uuid(),
      share: z.enum(["none", "all", "selected"]),
      allianceIds: z.array(z.string().uuid()).max(500),
    })
    .parse({ assetId, share, allianceIds });
  const db = getDb();
  const valid =
    parsed.share === "selected" && parsed.allianceIds.length > 0
      ? (await db.select({ id: strategicAlliances.id }).from(strategicAlliances).where(inArray(strategicAlliances.id, parsed.allianceIds))).map((a) => a.id)
      : [];
  const [asset] = await db
    .update(marketingContentAssets)
    .set({ partnerShare: parsed.share === "selected" && valid.length === 0 ? "none" : parsed.share })
    .where(eq(marketingContentAssets.id, parsed.assetId))
    .returning({ fileName: marketingContentAssets.fileName });
  if (!asset) return;
  await db.delete(marketingAssetPartnerShares).where(eq(marketingAssetPartnerShares.assetId, parsed.assetId));
  if (valid.length > 0) {
    await db.insert(marketingAssetPartnerShares).values(valid.map((allianceId) => ({ assetId: parsed.assetId, allianceId })));
  }
  await logAuditEvent({
    action: "marketing.partner_share_changed",
    entityType: "marketing_content_asset",
    entityId: parsed.assetId,
    summary: `"${asset.fileName}" shared with partners: ${parsed.share}${valid.length ? ` (${valid.length})` : ""}`,
  });
  revalidatePath("/marketing-content");
}

import { StateAbbreviations } from "@mirawision/usa-map-react";
import { getDb } from "@/lib/db";
import { notaryStateGuide } from "@/lib/db/schema";
import type { NotaryStateGuide } from "@/lib/db/schema";

export async function getNotaryStateGuideData(): Promise<
  Record<string, NotaryStateGuide>
> {
  const rows = await getDb().select().from(notaryStateGuide);
  const data: Record<string, NotaryStateGuide> = {};
  for (const row of rows) {
    data[row.state] = row;
  }
  return data;
}

// Always returns exactly 50 entries — states with no row yet (not seeded,
// or removed) show up as an empty, "needs_review" placeholder so the admin
// table never silently omits a state.
export async function listNotaryStateGuide(): Promise<NotaryStateGuide[]> {
  const data = await getNotaryStateGuideData();
  const now = new Date();

  return StateAbbreviations.map((abbr) => {
    const existing = data[abbr];
    if (existing) return existing;

    return {
      state: abbr,
      officialAgency: null,
      officialWebsite: null,
      commissionLink: null,
      examLink: null,
      requirementsLink: null,
      sourceUrl: null,
      status: "needs_review",
      lastVerifiedDate: null,
      verifiedBy: null,
      updatedAt: now,
    } satisfies NotaryStateGuide;
  });
}

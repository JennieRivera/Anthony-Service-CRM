// National Notary State Guide — populates notary_state_guide from the
// client-supplied, source-verified 50-state dataset.
//
// Real, permanent reference data — not sample/demo data — same reasoning
// as scripts/seed-service-colors.ts: no "[SEED DATA]" tag, no unseed
// counterpart. Safe to re-run: rows are upserted by state abbreviation.
import { config } from "dotenv";
import { getDb } from "../src/lib/db";
import { notaryStateGuide } from "../src/lib/db/schema";
import { notaryStateGuideSeed } from "../src/lib/data/notaryStateGuideSeed";

config({ path: ".env.local", quiet: true });

async function main() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  for (const row of notaryStateGuideSeed) {
    const { state, ...detail } = row;
    await db
      .insert(notaryStateGuide)
      .values({ state, ...detail, lastVerifiedDate: today })
      .onConflictDoUpdate({
        target: notaryStateGuide.state,
        set: { ...detail, lastVerifiedDate: today, updatedAt: new Date() },
      });
    console.log(`Upserted notary guide row: ${state}`);
  }

  console.log("\nDone. National Notary State Guide rows in database:");
  const all = await db.select().from(notaryStateGuide);
  console.table(
    all.map((r) => ({ state: r.state, status: r.status, agency: r.officialAgency })),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

// Interactive Sales Tax Map — populates sales_tax_state_info from a
// verified 50-state dataset of official Department of Revenue links.
//
// Real, permanent reference data — not sample/demo data — same reasoning
// as scripts/seed-notary-state-guide.ts: no "[SEED DATA]" tag, no unseed
// counterpart. Safe to re-run: rows are upserted by state.
import { config } from "dotenv";
import { getDb } from "../src/lib/db";
import { salesTaxStateInfo } from "../src/lib/db/schema";
import { salesTaxStateInfoSeed } from "../src/lib/data/salesTaxStateInfoSeed";

config({ path: ".env.local", quiet: true });

async function main() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  for (const row of salesTaxStateInfoSeed) {
    const { state, ...detail } = row;
    await db
      .insert(salesTaxStateInfo)
      .values({
        state,
        ...detail,
        lastVerifiedDate: today,
        verifiedBy: "Verified import",
      })
      .onConflictDoUpdate({
        target: salesTaxStateInfo.state,
        set: {
          ...detail,
          lastVerifiedDate: today,
          verifiedBy: "Verified import",
          updatedAt: new Date(),
        },
      });
    console.log(`Upserted sales tax state info: ${state}`);
  }

  console.log("\nDone. Sales tax state info rows in database:");
  const all = await db.select().from(salesTaxStateInfo);
  console.table(
    all.map((r) => ({
      state: r.state,
      agency: r.stateTaxAgency,
      website: r.officialWebsite,
    })),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

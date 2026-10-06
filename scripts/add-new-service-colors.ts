// One-off (2026-10-06): adds the color rows for the three new service
// types (crm_technology, corporate_events, remodeling) WITHOUT touching any
// color the owner already customized — unlike seed-service-colors.ts,
// which overwrites every row. Safe to re-run: existing keys are skipped.
//
// Run with:
//   npx tsx scripts/add-new-service-colors.ts
import { config } from "dotenv";
import { getDb } from "../src/lib/db";
import { serviceColorSettings } from "../src/lib/db/schema";

config({ path: ".env.local", quiet: true });

const NEW_COLORS = [
  { key: "crm_technology", colorName: "Indigo", colorHex: "#3F51B5", sortOrder: 18 },
  { key: "corporate_events", colorName: "Raspberry", colorHex: "#AD1457", sortOrder: 19 },
  { key: "remodeling", colorName: "Brown", colorHex: "#8D6E63", sortOrder: 20 },
];

async function main() {
  const inserted = await getDb()
    .insert(serviceColorSettings)
    .values(NEW_COLORS)
    .onConflictDoNothing({ target: serviceColorSettings.key })
    .returning({ key: serviceColorSettings.key });
  console.log(`Added: ${inserted.map((r) => r.key).join(", ") || "(none — already present)"}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);

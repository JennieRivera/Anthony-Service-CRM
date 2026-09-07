// Calendar enhancement, Session 1 — populates the Service Color Settings
// table (CALENDAR-PLAN.md section 4) from the plan's suggested colors.
//
// Real, permanent system configuration — not sample/demo data — same
// reasoning as scripts/seed-ai-agents.ts: no "[SEED DATA]" tag, no unseed
// counterpart. Safe to re-run: rows are upserted by key.
import { config } from "dotenv";
import { getDb } from "../src/lib/db";
import { serviceColorSettings } from "../src/lib/db/schema";

config({ path: ".env.local", quiet: true });

const COLORS: {
  key: string;
  colorName: string;
  colorHex: string;
  sortOrder: number;
}[] = [
  // Real case/appointment service types (serviceTypeEnum) — every value
  // that can actually be selected on an appointment today.
  { key: "notary", colorName: "Navy Blue", colorHex: "#0F1A2B", sortOrder: 1 },
  { key: "online_notary", colorName: "Navy Blue", colorHex: "#0F1A2B", sortOrder: 2 },
  { key: "tax_prep", colorName: "Green", colorHex: "#2E7D32", sortOrder: 3 },
  { key: "bookkeeping", colorName: "Teal", colorHex: "#00897B", sortOrder: 4 },
  { key: "immigration", colorName: "Purple", colorHex: "#6A4C93", sortOrder: 5 },
  { key: "document_prep", colorName: "Light Blue", colorHex: "#4FC3F7", sortOrder: 6 },
  { key: "credit_financing", colorName: "Gold", colorHex: "#B8964A", sortOrder: 7 },
  { key: "leadership", colorName: "Orange", colorHex: "#EF6C00", sortOrder: 8 },
  { key: "company_registration", colorName: "Dark Green", colorHex: "#1B5E20", sortOrder: 9 },
  { key: "academy", colorName: "Sky Blue", colorHex: "#29B6F6", sortOrder: 10 },
  { key: "marketing", colorName: "Pink", colorHex: "#EC407A", sortOrder: 11 },
  // Not explicitly listed in the plan's suggested colors — default to
  // "Other" gray, editable by Admin like everything else here.
  { key: "sales_tax", colorName: "Gray", colorHex: "#78909C", sortOrder: 12 },
  { key: "irs_administrative", colorName: "Gray", colorHex: "#78909C", sortOrder: 13 },
  { key: "insurance_compliance", colorName: "Gray", colorHex: "#78909C", sortOrder: 14 },
  // Categories from the plan that aren't a serviceType value today (see
  // schema.ts comment on serviceColorSettings) — reserved for whenever an
  // appointment can be linked to a referral or a strategic alliance.
  { key: "commercial_finance_referral", colorName: "Red", colorHex: "#C62828", sortOrder: 15 },
  { key: "community_strategic_alliances", colorName: "Lavender", colorHex: "#9575CD", sortOrder: 16 },
  { key: "other", colorName: "Gray", colorHex: "#78909C", sortOrder: 17 },
];

async function main() {
  const db = getDb();
  for (const color of COLORS) {
    await db
      .insert(serviceColorSettings)
      .values(color)
      .onConflictDoUpdate({
        target: serviceColorSettings.key,
        set: { ...color, updatedAt: new Date() },
      });
    console.log(`Upserted color: ${color.key} -> ${color.colorName} (${color.colorHex})`);
  }

  console.log("\nDone. Service colors in database:");
  const all = await db
    .select()
    .from(serviceColorSettings)
    .orderBy(serviceColorSettings.sortOrder);
  console.table(all.map((c) => ({ key: c.key, colorName: c.colorName, colorHex: c.colorHex })));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

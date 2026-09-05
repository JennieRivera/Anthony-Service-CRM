import { getDb } from "@/lib/db";
import { salesTaxStateInfo, salesTaxCaseDetails } from "@/lib/db/schema";
import type { SalesTaxStateInfo } from "@/lib/db/schema";

export type SalesTaxMapColor = "green" | "blue" | "gold" | "red" | "gray";

export type SalesTaxMapStateData = {
  info: SalesTaxStateInfo | null;
  activeCaseCount: number;
  color: SalesTaxMapColor;
};

// Pending-action statuses that should show Gold even if the state also has
// an unrelated active case — a filing due in one case is worth flagging
// regardless of how many other cases are quietly active.
const PENDING_STATUSES = new Set([
  "research_required",
  "registration_pending",
  "submitted",
  "filing_due",
]);

export async function getSalesTaxMapData(): Promise<
  Record<string, SalesTaxMapStateData>
> {
  const db = getDb();
  const [stateInfoRows, caseRows] = await Promise.all([
    db.select().from(salesTaxStateInfo),
    db
      .select({
        state: salesTaxCaseDetails.state,
        status: salesTaxCaseDetails.status,
      })
      .from(salesTaxCaseDetails),
  ]);

  const infoByState = new Map(stateInfoRows.map((row) => [row.state, row]));
  const casesByState = new Map<string, (typeof caseRows)>();
  for (const row of caseRows) {
    const list = casesByState.get(row.state) ?? [];
    list.push(row);
    casesByState.set(row.state, list);
  }

  const states = new Set([...infoByState.keys(), ...casesByState.keys()]);
  const data: Record<string, SalesTaxMapStateData> = {};

  for (const state of states) {
    const info = infoByState.get(state) ?? null;
    const stateCases = casesByState.get(state) ?? [];

    let color: SalesTaxMapColor;
    if (stateCases.some((c) => c.status === "past_due")) {
      color = "red";
    } else if (stateCases.some((c) => PENDING_STATUSES.has(c.status))) {
      color = "gold";
    } else if (stateCases.some((c) => c.status !== "closed")) {
      color = "green";
    } else if (info) {
      color = "blue";
    } else {
      color = "gray";
    }

    data[state] = { info, activeCaseCount: stateCases.length, color };
  }

  return data;
}

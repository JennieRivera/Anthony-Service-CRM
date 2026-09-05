"use server";

import { getStateBusinessSummary } from "@/lib/queries/stateBusinessSummary";

export async function getStateBusinessSummaryAction(state: string) {
  return getStateBusinessSummary(state);
}

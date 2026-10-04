"use server";

import { getStateBusinessSummary } from "@/lib/queries/stateBusinessSummary";
import { requireAuthenticatedUser } from "@/lib/permissions";

export async function getStateBusinessSummaryAction(state: string) {
  await requireAuthenticatedUser();
  return getStateBusinessSummary(state);
}

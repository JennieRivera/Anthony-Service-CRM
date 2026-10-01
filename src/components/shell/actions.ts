"use server";

import { signOut } from "@/auth";
import { globalSearch, type GlobalSearchResults } from "@/lib/queries/globalSearch";

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function globalSearchAction(query: string): Promise<GlobalSearchResults> {
  return globalSearch(query);
}

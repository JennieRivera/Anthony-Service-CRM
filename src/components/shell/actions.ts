"use server";

import { signOut } from "@/auth";
import { globalSearch, type GlobalSearchResults } from "@/lib/queries/globalSearch";
import { requireAuthenticatedUser } from "@/lib/permissions";

// Intentionally the one unguarded Server Action: signing out exposes no
// data, and it must keep working for a user whose access was just revoked
// (getCurrentRole() would return null for them).
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function globalSearchAction(query: string): Promise<GlobalSearchResults> {
  await requireAuthenticatedUser();
  return globalSearch(query);
}

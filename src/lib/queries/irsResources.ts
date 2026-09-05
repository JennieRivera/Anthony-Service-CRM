import { asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { irsResources } from "@/lib/db/schema";

export async function listIrsResources() {
  return getDb()
    .select()
    .from(irsResources)
    .orderBy(asc(irsResources.category), asc(irsResources.name));
}

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clientCommunicationPreferences } from "@/lib/db/schema";

export async function getCommunicationPreferences(clientId: string) {
  const [row] = await getDb()
    .select()
    .from(clientCommunicationPreferences)
    .where(eq(clientCommunicationPreferences.clientId, clientId))
    .limit(1);

  return row ?? null;
}

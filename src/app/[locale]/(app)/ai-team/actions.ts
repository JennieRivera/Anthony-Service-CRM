"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aiAgents } from "@/lib/db/schema";

// Pausing an agent only flips its own status flag — it never touches the
// clients/cases/tasks it works over (section 15).
export async function toggleAiAgentPauseAction(id: string) {
  const db = getDb();
  const [agent] = await db
    .select({ status: aiAgents.status })
    .from(aiAgents)
    .where(eq(aiAgents.id, id))
    .limit(1);
  if (!agent) return;

  const nextStatus = agent.status === "paused" ? "online" : "paused";

  await db
    .update(aiAgents)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(aiAgents.id, id));

  revalidatePath("/ai-team");
}

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aiEscalations, aiAgents, clients, cases } from "@/lib/db/schema";

export async function listAiEscalations() {
  return getDb()
    .select({
      id: aiEscalations.id,
      escalationSeq: aiEscalations.escalationSeq,
      createdAt: aiEscalations.createdAt,
      reason: aiEscalations.reason,
      riskLevel: aiEscalations.riskLevel,
      status: aiEscalations.status,
      assignedHumanEmail: aiEscalations.assignedHumanEmail,
      agentName: aiAgents.name,
      agentSlug: aiAgents.slug,
      clientId: clients.id,
      clientName: clients.fullName,
      caseTitle: cases.title,
    })
    .from(aiEscalations)
    .leftJoin(aiAgents, eq(aiEscalations.agentId, aiAgents.id))
    .leftJoin(clients, eq(aiEscalations.clientId, clients.id))
    .leftJoin(cases, eq(aiEscalations.caseId, cases.id))
    .orderBy(desc(aiEscalations.createdAt));
}

export async function getAiEscalationById(id: string) {
  const [row] = await getDb()
    .select({
      escalation: aiEscalations,
      agentName: aiAgents.name,
      agentSlug: aiAgents.slug,
      clientName: clients.fullName,
      caseTitle: cases.title,
    })
    .from(aiEscalations)
    .leftJoin(aiAgents, eq(aiEscalations.agentId, aiAgents.id))
    .leftJoin(clients, eq(aiEscalations.clientId, clients.id))
    .leftJoin(cases, eq(aiEscalations.caseId, cases.id))
    .where(eq(aiEscalations.id, id))
    .limit(1);
  return row ?? null;
}

export async function listActiveAiAgentsForSelect() {
  return getDb()
    .select({ id: aiAgents.id, name: aiAgents.name, title: aiAgents.title })
    .from(aiAgents)
    .where(eq(aiAgents.launchStatus, "active"))
    .orderBy(aiAgents.sortOrder);
}

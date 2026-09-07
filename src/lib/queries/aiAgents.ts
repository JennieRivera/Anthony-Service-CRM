import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  aiAgents,
  aiAgentKnowledgeBase,
  aiEscalations,
  aiActivityLog,
  clients,
  cases,
  referrals,
  tasks,
} from "@/lib/db/schema";

export async function listAiAgents() {
  return getDb().select().from(aiAgents).orderBy(aiAgents.sortOrder);
}

export async function getAiAgentRecentActivity(agentId: string, limit = 10) {
  return getDb()
    .select({
      id: aiActivityLog.id,
      occurredAt: aiActivityLog.occurredAt,
      action: aiActivityLog.action,
      actionDetail: aiActivityLog.actionDetail,
      outcome: aiActivityLog.outcome,
      approvalLevel: aiActivityLog.approvalLevel,
      clientName: clients.fullName,
      caseTitle: cases.title,
    })
    .from(aiActivityLog)
    .leftJoin(clients, eq(aiActivityLog.clientId, clients.id))
    .leftJoin(cases, eq(aiActivityLog.caseId, cases.id))
    .where(eq(aiActivityLog.agentId, agentId))
    .orderBy(desc(aiActivityLog.occurredAt))
    .limit(limit);
}

export async function getAiAgentById(id: string) {
  const [agent] = await getDb()
    .select()
    .from(aiAgents)
    .where(eq(aiAgents.id, id))
    .limit(1);
  return agent ?? null;
}

export async function getAiAgentKnowledgeBaseCounts() {
  const db = getDb();
  const rows = await db
    .select({ agentId: aiAgentKnowledgeBase.agentId })
    .from(aiAgentKnowledgeBase);
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.agentId, (counts.get(row.agentId) ?? 0) + 1);
  }
  return counts;
}

export async function getAiAgentBySlug(slug: string) {
  const db = getDb();
  const [agent] = await db
    .select()
    .from(aiAgents)
    .where(eq(aiAgents.slug, slug))
    .limit(1);
  if (!agent) return null;

  const knowledgeBase = await db
    .select()
    .from(aiAgentKnowledgeBase)
    .where(eq(aiAgentKnowledgeBase.agentId, agent.id))
    .orderBy(aiAgentKnowledgeBase.section, aiAgentKnowledgeBase.sortOrder);

  return { agent, knowledgeBase };
}

const DEPARTMENTS_WITH_LIVE_SCOPE = [
  "client_service",
  "tax_bookkeeping",
  "commercial_finance",
  "immigration",
  "document_services",
] as const;

type DepartmentStats = { assignedClients: number; tasksToday: number };

// Section 15's "no duplicate data" rule means an agent has no assignment
// column of its own — "Clientes Asignados" / "Tareas de Hoy" are a live
// view over each agent's department, scoped through the exact same
// clients/cases/referrals/tasks rows every other module reads.
export async function getAiAgentWorkloadStats() {
  const db = getDb();
  const [allClients, allCases, allReferrals, allTasks, allEscalations] =
    await Promise.all([
      db.select().from(clients),
      db.select().from(cases),
      db.select().from(referrals),
      db.select().from(tasks),
      db.select().from(aiEscalations),
    ]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const openTasks = allTasks.filter((t) => t.status === "open");
  const openCases = allCases.filter(
    (c) => !["completed", "cancelled"].includes(c.status),
  );
  const openCommercialFinanceReferrals = allReferrals.filter(
    (r) =>
      r.category === "commercial_finance" &&
      !["closed_funded", "commission_paid", "declined", "cancelled"].includes(
        r.pipelineStatus,
      ),
  );

  function scopedClientIds(department: string): Set<string> {
    switch (department) {
      case "client_service":
        return new Set(
          allClients.filter((c) => c.status === "lead").map((c) => c.id),
        );
      case "tax_bookkeeping":
        return new Set(
          openCases
            .filter((c) => ["tax_prep", "bookkeeping"].includes(c.serviceType))
            .map((c) => c.clientId),
        );
      case "commercial_finance":
        return new Set(openCommercialFinanceReferrals.map((r) => r.clientId));
      case "immigration":
        return new Set(
          openCases
            .filter((c) => c.serviceType === "immigration")
            .map((c) => c.clientId),
        );
      case "document_services":
        return new Set(
          openCases
            .filter((c) => c.serviceType === "document_prep")
            .map((c) => c.clientId),
        );
      default:
        return new Set();
    }
  }

  const byDepartment = new Map<string, DepartmentStats>();
  for (const department of DEPARTMENTS_WITH_LIVE_SCOPE) {
    const ids = scopedClientIds(department);
    const tasksToday = openTasks.filter(
      (t) => t.dueDate === todayStr && ids.has(t.clientId),
    ).length;
    byDepartment.set(department, {
      assignedClients: ids.size,
      tasksToday,
    });
  }

  const openEscalationsByAgentId = new Map<string, number>();
  for (const esc of allEscalations) {
    if (!esc.agentId) continue;
    if (esc.status !== "open" && esc.status !== "in_progress") continue;
    openEscalationsByAgentId.set(
      esc.agentId,
      (openEscalationsByAgentId.get(esc.agentId) ?? 0) + 1,
    );
  }

  return { byDepartment, openEscalationsByAgentId };
}

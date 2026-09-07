import { getDb } from "@/lib/db";
import {
  aiAgents,
  aiActivityLog,
  aiEscalations,
  cases,
  tasks,
  referrals,
} from "@/lib/db/schema";

// Section 14's 9 dashboard cards — every number here reads real rows from
// the same tables the rest of the CRM already uses (section 15: no agent
// gets its own copy of anything). Some cards (tax/bookkeeping alerts,
// pending documents) reflect the whole system's workload, not just what an
// agent has touched, since most of that workload predates any agent
// attribution existing at all — same reasoning as the main dashboard.
export async function getAiDashboardMetrics() {
  const db = getDb();

  const [allAgents, activityRows, allEscalations, allReferrals, allTasks, allCases] =
    await Promise.all([
      db.select().from(aiAgents),
      db
        .select({
          action: aiActivityLog.action,
          occurredAt: aiActivityLog.occurredAt,
          clientId: aiActivityLog.clientId,
          requiresHumanApproval: aiActivityLog.requiresHumanApproval,
          humanApproved: aiActivityLog.humanApproved,
        })
        .from(aiActivityLog),
      db
        .select({
          status: aiEscalations.status,
          agentId: aiEscalations.agentId,
        })
        .from(aiEscalations),
      db
        .select({ pipelineStatus: referrals.pipelineStatus })
        .from(referrals),
      db
        .select({ id: tasks.id, type: tasks.type, status: tasks.status, caseId: tasks.caseId })
        .from(tasks),
      db.select({ id: cases.id, serviceType: cases.serviceType }).from(cases),
    ]);

  const onlineAgentsCount = allAgents.filter((a) => a.status === "online").length;

  const tasksCreatedByAiCount = activityRows.filter(
    (a) => a.action === "create_task",
  ).length;

  const openEscalationsCount = allEscalations.filter((e) =>
    ["open", "in_progress"].includes(e.status),
  ).length;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const clientsServedToday = new Set(
    activityRows
      .filter((a) => a.clientId && new Date(a.occurredAt) >= startOfToday)
      .map((a) => a.clientId as string),
  );

  const referralsHandledCount = allReferrals.filter(
    (r) =>
      !["closed_funded", "commission_paid", "declined", "cancelled"].includes(
        r.pipelineStatus,
      ),
  ).length;

  const pendingDocumentsCount = allTasks.filter(
    (t) => t.type === "document_reminder" && t.status === "open",
  ).length;

  const caseServiceTypeById = new Map(allCases.map((c) => [c.id, c.serviceType]));
  const taxBookkeepingAlertsCount = allTasks.filter((t) => {
    if (t.status !== "open" || !t.caseId) return false;
    const serviceType = caseServiceTypeById.get(t.caseId);
    return serviceType === "tax_prep" || serviceType === "bookkeeping";
  }).length;

  const immigrationAgentId = allAgents.find(
    (a) => a.department === "immigration" && a.launchStatus === "active",
  )?.id;
  const immigrationEscalationsCount = allEscalations.filter(
    (e) =>
      e.agentId === immigrationAgentId &&
      ["open", "in_progress"].includes(e.status),
  ).length;

  const pendingHumanReviewsCount = activityRows.filter(
    (a) => a.requiresHumanApproval && a.humanApproved !== true,
  ).length;

  return {
    onlineAgentsCount,
    tasksCreatedByAiCount,
    openEscalationsCount,
    clientsServedTodayCount: clientsServedToday.size,
    referralsHandledCount,
    pendingDocumentsCount,
    taxBookkeepingAlertsCount,
    immigrationEscalationsCount,
    pendingHumanReviewsCount,
  };
}

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  aiAgents,
  aiActivityLog,
  aiAgentDepartmentEnum,
  aiActivityActionEnum,
} from "@/lib/db/schema";

type Department = (typeof aiAgentDepartmentEnum.enumValues)[number];
type ActivityAction = (typeof aiActivityActionEnum.enumValues)[number];
type ApprovalLevel = "level_1_automatic" | "level_2_human_review" | "level_3_human_only";

// Section 11's 3-tier policy, keyed by action type — a fixed rule, not a
// per-agent or admin-editable setting. Level 1 covers "crear tarea, crear
// nota, crear recordatorio, clasificar servicio, redactar mensaje (borrador,
// no enviado)" — every action type this codebase's automation actually
// performs today. Actually sending a message to a client is Level 2 for
// this business (every service line here — taxes, immigration, credit,
// commercial finance — is on section 11's Level 2 topic list), so
// send_message never resolves to Level 1, even though no caller uses it
// yet; nothing here can reach Level 3, since no action type represents a
// legal/financial/government decision — those stay entirely human by the
// absence of any code path, not by a check in this function.
export function getApprovalLevelForAction(action: ActivityAction): ApprovalLevel {
  if (action === "send_message") return "level_2_human_review";
  return "level_1_automatic";
}

// Phase 6, Session 4 — the only case service types with a launched agent
// today (see PHASE6-PLAN.md sections 2-6). A service type with no entry
// here has no agent to attribute automation to yet, and none should be
// invented — e.g. insurance_compliance, notary, academy, credit_financing
// stay unattributed until (if ever) an agent covers that department.
const DEPARTMENT_BY_SERVICE_TYPE: Partial<Record<string, Department>> = {
  tax_prep: "tax_bookkeeping",
  bookkeeping: "tax_bookkeeping",
  immigration: "immigration",
  document_prep: "document_services",
};

export async function getActiveAgentIdForDepartment(
  department: Department,
): Promise<string | null> {
  const [agent] = await getDb()
    .select({ id: aiAgents.id })
    .from(aiAgents)
    .where(
      and(
        eq(aiAgents.department, department),
        eq(aiAgents.launchStatus, "active"),
      ),
    )
    .limit(1);
  return agent?.id ?? null;
}

export async function getActiveAgentIdForServiceType(
  serviceType: string,
): Promise<string | null> {
  const department = DEPARTMENT_BY_SERVICE_TYPE[serviceType];
  if (!department) return null;
  return getActiveAgentIdForDepartment(department);
}

// Section 15's "no duplicate data" rule extends to activity logging: this
// never copies client/case fields onto the log row beyond the FK, and
// section 11's Level 1 ("crear tarea, crear nota, crear recordatorio,
// clasificar servicio") is exactly the set of actions this helper is used
// for — genuinely autonomous, rules-based automation, not a human-reviewed
// client message.
export async function logAiActivity(params: {
  agentId: string;
  clientId?: string | null;
  caseId?: string | null;
  action: ActivityAction;
  actionDetail?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
}) {
  const approvalLevel = getApprovalLevelForAction(params.action);
  const requiresHumanApproval = approvalLevel !== "level_1_automatic";

  await getDb()
    .insert(aiActivityLog)
    .values({
      agentId: params.agentId,
      clientId: params.clientId ?? null,
      caseId: params.caseId ?? null,
      action: params.action,
      actionDetail: params.actionDetail ?? null,
      previousValue: params.previousValue ?? null,
      newValue: params.newValue ?? null,
      approvalLevel,
      requiresHumanApproval,
      outcome: requiresHumanApproval ? "pending_approval" : "success",
    });
}

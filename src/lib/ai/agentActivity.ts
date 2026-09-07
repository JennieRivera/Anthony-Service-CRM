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
      approvalLevel: "level_1_automatic",
      requiresHumanApproval: false,
      outcome: "success",
    });
}

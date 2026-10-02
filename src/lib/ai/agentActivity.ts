import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  aiAgents,
  aiActivityLog,
  aiAgentDepartmentEnum,
  aiActivityActionEnum,
} from "@/lib/db/schema";

type Department = (typeof aiAgentDepartmentEnum.enumValues)[number];
export type ActivityAction = (typeof aiActivityActionEnum.enumValues)[number];
export type ApprovalLevel = "level_1_automatic" | "level_2_human_review" | "level_3_human_only";

// Section 11's 3-tier policy, keyed by action type — a fixed rule, not a
// per-agent or admin-editable setting. Level 1 covers "crear tarea, crear
// nota, crear recordatorio, clasificar servicio, redactar mensaje (borrador,
// no enviado)" — every action type this codebase's automation actually
// performs today. Level 2 and level 3 action types (added in the AI
// Foundation / Security phase) have no real caller yet — there is still no
// execution engine anywhere in this app — but are classified here so
// src/lib/ai/agentAuthorization.ts has a real policy to enforce against
// instead of an empty list. Nothing promotes a level_3 action to anything
// lower; see agentAuthorization.ts for why there is no override.
const LEVEL_2_ACTIONS: ReadonlySet<ActivityAction> = new Set([
  "send_message",
  "update_client_data",
  "academy_grade_change",
  "invoice_status_change",
  "b2b_status_change",
]);

const LEVEL_3_ACTIONS: ReadonlySet<ActivityAction> = new Set([
  "financial_transaction",
  "payment_capture",
  "delete_record",
  "admin_change",
  "commission_change",
  "legal_determination",
  "immigration_determination",
  "document_release",
  "diamond_community_write",
  "b2b_alliance_write",
]);

export function getApprovalLevelForAction(action: ActivityAction): ApprovalLevel {
  if (LEVEL_3_ACTIONS.has(action)) return "level_3_human_only";
  if (LEVEL_2_ACTIONS.has(action)) return "level_2_human_review";
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

// AI Foundation / Security phase — same lookup as above, but returning the
// full row authorizeAgentAction() needs (allowedModules/deniedModules/
// permission booleans), not just an id. Added instead of widening the
// existing id-only helpers so cases/[id]/page.tsx's unrelated "which agent
// would this escalate to" lookup keeps its original, smaller shape.
//
// Also excludes a "paused" agent, unlike the id-only helper above — pausing
// an agent (toggleAiAgentPauseAction) previously had no effect on whether
// new automation kept getting attributed to it, which is exactly the kind
// of status dishonesty section 9 asks to fix: a paused card should stop
// claiming new work, not just display a different dot color while still
// accumulating it under the hood.
export async function getActiveAgentForDepartment(department: Department) {
  const [agent] = await getDb()
    .select()
    .from(aiAgents)
    .where(
      and(
        eq(aiAgents.department, department),
        eq(aiAgents.launchStatus, "active"),
        ne(aiAgents.status, "paused"),
      ),
    )
    .limit(1);
  return agent ?? null;
}

export async function getActiveAgentForServiceType(serviceType: string) {
  const department = DEPARTMENT_BY_SERVICE_TYPE[serviceType];
  if (!department) return null;
  return getActiveAgentForDepartment(department);
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

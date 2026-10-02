// AI Foundation / Security phase — section 11's audit-log requirement:
// every future agent operation (not just the ones that succeed) must be
// traceable by agent, timestamp, requested action, module, approval level,
// approved/denied, human approver, and outcome — without ever persisting a
// secret or sensitive field value. This is the single write path a future
// executor uses to record what authorizeAgentAction() decided; it never
// calls an LLM and never performs the underlying action itself.
import { getDb } from "@/lib/db";
import { aiActivityLog } from "@/lib/db/schema";
import type { AiAgent } from "@/lib/db/schema";
import {
  authorizeAgentAction,
  type AiModuleKey,
} from "@/lib/ai/agentAuthorization";
import type { ActivityAction } from "@/lib/ai/agentActivity";
import { sanitizeForAiVisibility } from "@/lib/ai/sensitiveData";

type AuthorizableAgent = Parameters<typeof authorizeAgentAction>[0]["agent"] &
  Pick<AiAgent, "id">;

// Runs the authorization check AND records the outcome in one call, so no
// future caller can accidentally check authorizeAgentAction() and then
// forget to log the result (or log a different result than what was
// actually decided). Returns the same decision authorizeAgentAction()
// would, so the caller still knows whether to proceed.
export async function authorizeAndLogAgentAction(params: {
  agent: AuthorizableAgent;
  moduleKey: AiModuleKey;
  action: ActivityAction;
  clientId?: string | null;
  caseId?: string | null;
  actionDetail?: string | null;
  humanApproved?: boolean;
  humanApproverEmail?: string | null;
}) {
  const decision = authorizeAgentAction({
    agent: params.agent,
    moduleKey: params.moduleKey,
    action: params.action,
    humanApproved: params.humanApproved,
  });

  const outcome = decision.allowed
    ? "success"
    : decision.requiresHumanApproval
      ? "pending_approval"
      : "denied";

  await getDb()
    .insert(aiActivityLog)
    .values({
      agentId: params.agent.id,
      clientId: params.clientId ?? null,
      caseId: params.caseId ?? null,
      action: params.action,
      moduleKey: params.moduleKey,
      actionDetail: sanitizeForAiVisibility(params.actionDetail),
      approvalLevel: decision.approvalLevel,
      requiresHumanApproval: decision.requiresHumanApproval,
      humanApproved: decision.allowed ? (params.humanApproved ?? null) : null,
      humanApproverEmail: decision.allowed ? (params.humanApproverEmail ?? null) : null,
      outcome,
      errorMessage: decision.allowed ? null : decision.reason,
    });

  return decision;
}

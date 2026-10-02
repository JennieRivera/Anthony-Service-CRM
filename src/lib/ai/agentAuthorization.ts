// AI Foundation / Security phase — the real authorization/enforcement
// layer section 5 asked for. This is the ONE place that decides whether an
// agent may perform a requested action against a requested module. There is
// still no execution engine anywhere in this codebase (no AI provider, no
// LLM call) — this module exists so that WHEN one is eventually built, it
// is structurally incapable of calling getDb() directly on an agent's
// behalf. A future executor MUST call authorizeAgentAction() first and
// respect its decision; nothing here connects to a model or sends anything
// anywhere.
//
// Default-deny, checked in this exact order:
//   1. The agent must be launched ("active"), never "coming_soon".
//   2. deniedModules always wins — if the requested module is denied,
//      nothing below can override that, even if the same module also
//      appears in allowedModules (a data-entry contradiction should fail
//      closed, not open).
//   3. The requested module must be explicitly present in allowedModules.
//      An empty/missing allowedModules list denies everything — access is
//      never inferred from department name, title, or anything else.
//   4. canRead gates everything (every action implies at least reading).
//   5. The specific permission boolean for the requested action type.
//   6. The action's approval level: level_1 may proceed; level_2 proceeds
//      only when the caller already has explicit human approval in hand;
//      level_3 can never proceed through this path, period — there is no
//      "humanApproved: true" override for level_3, by design, because a
//      level_3 action is defined as one only a human performs directly in
//      the CRM UI, never through an agent.
import type { AiAgent } from "@/lib/db/schema";
import { getApprovalLevelForAction, type ActivityAction } from "@/lib/ai/agentActivity";

export type AiModuleKey = NonNullable<AiAgent["allowedModules"]>[number];

const ACTION_PERMISSION_COLUMN: Record<
  ActivityAction,
  keyof Pick<
    AiAgent,
    | "canWrite"
    | "canCreateTask"
    | "canCreateNote"
    | "canChangeStatus"
    | "canSendDraft"
    | "canSendMessage"
    | "canEscalate"
  >
> = {
  create_task: "canCreateTask",
  create_note: "canCreateNote",
  create_reminder: "canCreateTask", // reminders are stored as tasks (see cron) — no separate column
  classify_service: "canWrite",
  draft_message: "canSendDraft",
  change_status: "canChangeStatus",
  send_draft: "canSendDraft",
  send_message: "canSendMessage",
  escalate: "canEscalate",
  other: "canWrite",
  update_client_data: "canWrite",
  academy_grade_change: "canWrite",
  invoice_status_change: "canWrite",
  b2b_status_change: "canWrite",
  // Level 3 actions have no agent-usable permission column at all — the
  // table below is consulted, but authorizeAgentAction() short-circuits to
  // a deny for level_3 before this map is ever read for these keys.
  financial_transaction: "canWrite",
  payment_capture: "canWrite",
  delete_record: "canWrite",
  admin_change: "canWrite",
  commission_change: "canWrite",
  legal_determination: "canWrite",
  immigration_determination: "canWrite",
  document_release: "canWrite",
  diamond_community_write: "canWrite",
  b2b_alliance_write: "canWrite",
};

export type AuthorizationDenialReason =
  | "agent_not_launched"
  | "module_explicitly_denied"
  | "module_not_allowed"
  | "read_permission_missing"
  | "action_permission_missing"
  | "level_3_human_only"
  | "level_2_requires_human_approval";

export type AuthorizationDecision =
  | {
      allowed: true;
      approvalLevel: ReturnType<typeof getApprovalLevelForAction>;
      requiresHumanApproval: false;
    }
  | {
      allowed: false;
      approvalLevel: ReturnType<typeof getApprovalLevelForAction>;
      requiresHumanApproval: boolean;
      reason: AuthorizationDenialReason;
    };

export function authorizeAgentAction(params: {
  agent: Pick<
    AiAgent,
    | "launchStatus"
    | "allowedModules"
    | "deniedModules"
    | "canRead"
    | "canWrite"
    | "canCreateTask"
    | "canCreateNote"
    | "canChangeStatus"
    | "canSendDraft"
    | "canSendMessage"
    | "canEscalate"
  >;
  moduleKey: AiModuleKey;
  action: ActivityAction;
  // Only ever relevant for a level_2 action — a human has already approved
  // THIS specific request through the CRM's own UI (never inferred, never
  // defaulted to true). Ignored entirely for level_1 and level_3.
  humanApproved?: boolean;
}): AuthorizationDecision {
  const { agent, moduleKey, action } = params;
  const approvalLevel = getApprovalLevelForAction(action);

  if (agent.launchStatus !== "active") {
    return { allowed: false, approvalLevel, requiresHumanApproval: false, reason: "agent_not_launched" };
  }

  // Denied always overrides allowed, even if the same key appears in both
  // arrays — fail closed on a contradictory configuration.
  if (agent.deniedModules?.includes(moduleKey)) {
    return { allowed: false, approvalLevel, requiresHumanApproval: false, reason: "module_explicitly_denied" };
  }

  if (!agent.allowedModules?.includes(moduleKey)) {
    return { allowed: false, approvalLevel, requiresHumanApproval: false, reason: "module_not_allowed" };
  }

  if (!agent.canRead) {
    return { allowed: false, approvalLevel, requiresHumanApproval: false, reason: "read_permission_missing" };
  }

  const permissionColumn = ACTION_PERMISSION_COLUMN[action];
  if (!agent[permissionColumn]) {
    return { allowed: false, approvalLevel, requiresHumanApproval: false, reason: "action_permission_missing" };
  }

  if (approvalLevel === "level_3_human_only") {
    // No override exists for this branch on purpose — see module comment.
    return { allowed: false, approvalLevel, requiresHumanApproval: true, reason: "level_3_human_only" };
  }

  if (approvalLevel === "level_2_human_review" && !params.humanApproved) {
    return { allowed: false, approvalLevel, requiresHumanApproval: true, reason: "level_2_requires_human_approval" };
  }

  return { allowed: true, approvalLevel, requiresHumanApproval: false };
}

// Convenience wrapper for the one check callers most often need in
// isolation (used directly by the Diamond Community / B2B Alliances test
// cases) — module access alone, independent of any specific action.
export function isModuleAllowedForAgent(
  agent: Pick<AiAgent, "launchStatus" | "allowedModules" | "deniedModules">,
  moduleKey: AiModuleKey,
): boolean {
  if (agent.launchStatus !== "active") return false;
  if (agent.deniedModules?.includes(moduleKey)) return false;
  return Boolean(agent.allowedModules?.includes(moduleKey));
}

// MIADIAMANTE AI Foundation — Phase 2B-1: Provider-neutral conversation
// controller + safe tool selection.
//
// This file proves the pipeline from the Phase 2B architecture audit:
//
//   Authenticated human
//   -> conversation controller (this file)
//   -> [mocked] tool proposal (untrusted input — see ModelTurnProposal)
//   -> strict capability allow-list (TOOL_RUNNERS, derived from capabilities.ts)
//   -> server-side authorization (the exact existing authorize.ts chain,
//      invoked only via capabilityRunner.ts — never re-implemented here)
//   -> existing capabilityRunner
//   -> safe DTO
//   -> [mocked] response composition
//   -> audit (already happens INSIDE capabilityRunner.ts — nothing new
//      to add here)
//
// NO live AI provider exists or is called anywhere in this file. The
// "model" is, this phase, only ever a test fixture (see
// conversationController.test.ts) or — in production, right now — never
// invoked at all: Miadiamante.tsx does not import this module, so this
// entire controller is currently unreachable from any request path. It
// exists so the SERVER-SIDE SECURITY BOUNDARY can be built and proven
// before any real model, any conversation UI, or any persistence exists.
//
// HARD BOUNDARIES PRESERVED FROM PHASE 2A (never weakened here):
// - This file does not import getDb(), any `@/lib/db/schema` table, any
//   `@/lib/queries/*` function, or globalSearch.ts. It cannot read a
//   single row of business data except by calling the existing, already-
//   authorized capabilityRunner.ts functions below — the same functions
//   a direct Phase 2A caller would use, with zero new code path to get
//   authorization wrong in.
// - A proposed tool call is treated as entirely untrusted input, exactly
//   like a value typed by a user into a form: its `toolName` must exist
//   in TOOL_RUNNERS (derived from the live capability registry, see
//   below) and its `args` are handed, unmodified, to the real
//   capabilityRunner function, which re-validates them with the exact
//   same zod schema a direct Phase 2A call would use. This controller
//   performs NO separate/parallel input validation that could drift from
//   schemas.ts.
// - Identity and role are never accepted from the proposal. Every
//   TOOL_RUNNERS function re-derives the caller's session via auth()/
//   getCurrentRole() internally (unchanged from Phase 2A) — a proposal
//   field named `role`, `requestedByUserEmail`, or similar has zero
//   effect, because nothing downstream ever reads such a field from
//   `args` (the zod schemas don't define one, and even if a caller stuffs
//   one in, zod's default "strip unknown keys" behavior discards it
//   before it could reach anything — see conversationController.test.ts).
// - There is no code path anywhere in this file that re-reads a tool
//   call's own RESULT looking for further instructions. `runConversationTurn`
//   only ever executes the tool calls present in the ORIGINAL proposal
//   array; retrieved DTO data is returned to the caller as inert output,
//   never fed back in as a new proposal. This preserves the Phase 1
//   ordering guarantee (authorization before data, data never re-enters
//   authorization) for the conversational case specifically.

import {
  runCurrentUserContext,
  runAuthorizedNavigation,
  runInvoiceSummary,
  runFinancialReportSummary,
  runTaskList,
  runUpcomingAppointments,
  NEUTRAL_UNAVAILABLE_MESSAGE,
  type MiadiamanteCapabilityResult,
} from "./capabilityRunner";
import { IMPLEMENTED_CAPABILITIES, CAPABILITY_REGISTRY, type ImplementedCapabilityName } from "./capabilities";

// --- Tool allow-list, derived from the capability registry -----------------
// Keyed by `ImplementedCapabilityName` (the type derived from
// IMPLEMENTED_CAPABILITIES in capabilities.ts) so TypeScript refuses to
// compile if a capability is added/removed there without this mapping
// being updated to match — the closest a statically-typed mapping from
// string-identifier to function-reference can get to "no second,
// driftable list" (turning a name into a callable function always
// requires some explicit wiring; this makes the compiler enforce that
// the wiring stays complete and in sync with the single source of truth).
// A runtime assertion in the test file additionally proves the key count
// matches IMPLEMENTED_CAPABILITIES.length.
//
// Each entry calls the EXACT SAME exported capabilityRunner function a
// direct Phase 2A caller would use — no parallel execution path.
const TOOL_RUNNERS: Record<
  ImplementedCapabilityName,
  (args: unknown) => Promise<MiadiamanteCapabilityResult<unknown>>
> = {
  "current_user_context.read": () => runCurrentUserContext(),
  "authorized_navigation.read": () => runAuthorizedNavigation(),
  "invoice_summary.read": (args) => runInvoiceSummary(args),
  "financial_report_summary.read": (args) => runFinancialReportSummary(args),
  "task_list.read": (args) => runTaskList(args),
  "upcoming_appointments.read": (args) => runUpcomingAppointments(args),
};

// The model-facing tool list a future real provider integration (Phase
// 2B-3) would offer for structured tool-calling — generated FROM the
// registry, never a second hand-maintained list. Pure, synchronous,
// zero I/O: safe to call from anywhere, including a future client-facing
// "what can MIADIAMANTE help with" surface.
export interface ToolSpec {
  name: ImplementedCapabilityName;
  description: string;
}

export function getAvailableToolSpecs(): ToolSpec[] {
  return IMPLEMENTED_CAPABILITIES.map((name) => ({
    name,
    description: CAPABILITY_REGISTRY[name].description,
  }));
}

// --- Conversation turn types -------------------------------------------
// A single proposed tool call — UNTRUSTED input, whether it comes from a
// test fixture (this phase) or a real model's structured tool-calling
// output (a later phase). `toolName`/`args` are deliberately typed as
// wide/unknown — narrowing happens only by looking the name up in
// TOOL_RUNNERS and letting the real capabilityRunner function validate
// args with its own zod schema.
export interface ToolCallProposal {
  toolName: string;
  args?: unknown;
}

// What a (future, real, or today's mocked/test) model turn proposes. Both
// fields are optional and independent: a plain conversational turn may
// supply only `assistantText`; a data-driven turn may supply only
// `toolCalls`; nothing stops a future model from attempting both in one
// turn (the controller handles that cleanly — see runConversationTurn).
//
// IMPORTANT: `assistantText` here is ALWAYS either absent or an explicit,
// caller-supplied string (a test fixture, or — later — real model output
// handed in from outside this file). This controller never generates,
// infers, or fabricates conversational text itself — doing so would be
// exactly the "fake intelligence" the MIADIAMANTE shell is built to never
// claim (see provider.ts / executionStatus.ts). The controller is a safe
// EXECUTION environment for proposed tool calls, not a text generator.
export interface ModelTurnProposal {
  assistantText?: string;
  toolCalls?: ToolCallProposal[];
}

export interface ToolCallOutcome {
  toolName: string;
  allowed: boolean;
  data?: unknown;
  message?: string;
}

export interface ConversationTurnResult {
  assistantText: string | null;
  toolResults: ToolCallOutcome[];
}

// Injectable only for tests (see conversationController.test.ts), which
// pass a fake runners map so the controller's OWN branching logic —
// unknown-tool handling, multi-call aggregation, pass-through of
// assistantText, absence of recursion — can be proven with zero database
// access and zero authenticated session. Production code never passes
// this parameter, so it always defaults to the real TOOL_RUNNERS above,
// meaning every real invocation goes through the actual Phase 2A
// authorization chain with no way to substitute a weaker one.
export async function runConversationTurn(
  proposal: ModelTurnProposal,
  toolRunners: Record<string, (args: unknown) => Promise<MiadiamanteCapabilityResult<unknown>>> = TOOL_RUNNERS,
): Promise<ConversationTurnResult> {
  const toolCalls = proposal.toolCalls ?? [];
  const toolResults: ToolCallOutcome[] = [];

  for (const call of toolCalls) {
    toolResults.push(await executeToolCall(call, toolRunners));
  }

  // No recursion: toolResults are returned as-is. Nothing in this
  // function inspects a result's `data` for further tool-call
  // instructions, re-invokes itself, or feeds a result back in as a new
  // proposal — the only tool calls ever executed are the ones present in
  // the ORIGINAL `proposal.toolCalls` array, full stop.
  return {
    assistantText: proposal.assistantText ?? null,
    toolResults,
  };
}

async function executeToolCall(
  call: ToolCallProposal,
  toolRunners: Record<string, (args: unknown) => Promise<MiadiamanteCapabilityResult<unknown>>>,
): Promise<ToolCallOutcome> {
  const runner = toolRunners[call.toolName];

  // Fail closed for: an unknown name, an invented name, a write-action-
  // shaped name ("mark_invoice_paid"), "globalSearch", a still-
  // unimplemented registry entry ("client.read"), or literally anything
  // not in the exact six-capability allow-list — all handled by this one
  // branch, with the identical neutral message Phase 2A already uses.
  // No special-casing by name is needed or present: the allow-list IS
  // the enforcement.
  if (!runner) {
    return { toolName: call.toolName, allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }

  // The real capabilityRunner function performs, unchanged: session
  // resolution, RBAC/AI-permission authorization, zod input validation,
  // DTO retrieval, and audit logging. This controller adds no logic of
  // its own at this step — it only routes.
  const result = await runner(call.args);
  if (!result.allowed) {
    return { toolName: call.toolName, allowed: false, message: result.message };
  }
  return { toolName: call.toolName, allowed: true, data: result.data };
}

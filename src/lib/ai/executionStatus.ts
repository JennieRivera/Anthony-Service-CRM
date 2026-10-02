// AI Foundation / Security phase — section 9's "agent status honesty"
// requirement. The existing `status` column (online/offline/paused/
// needs_review/escalated) describes whether this agent's RULES-BASED
// automation is currently live — it has real meaning and stays as-is.
// What it does NOT describe, and what nothing in this codebase has ever
// made explicit in the UI, is whether the agent is backed by an actual AI
// model. This single constant is the only place that can ever claim an
// agent is AI-connected — flipping it to true requires actually wiring a
// provider (see the read-only audit: none exists today), never just
// editing a database row.
export const AI_PROVIDER_CONNECTED = false;

export type AiAgentExecutionLabel =
  | "coming_soon"
  | "configured"
  | "ready_for_ai_connection"
  | "ai_connected";

// Deliberately takes only launchStatus + bio (a cheap, true-today proxy for
// "has this agent's profile actually been filled in", since every
// "coming_soon" agent before this phase had no bio at all, and both Marco
// and Camila now do) — never a secret, never anything that implies more
// than the database actually contains.
export function getAiAgentExecutionLabel(agent: {
  launchStatus: "active" | "coming_soon";
  bio: string | null;
}): AiAgentExecutionLabel {
  if (agent.launchStatus === "coming_soon") {
    return agent.bio ? "configured" : "coming_soon";
  }
  // launchStatus === "active" from here down.
  return AI_PROVIDER_CONNECTED ? "ai_connected" : "ready_for_ai_connection";
}

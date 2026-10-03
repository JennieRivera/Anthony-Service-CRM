import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAiAgentExecutionLabel } from "@/lib/ai/executionStatus";
import type { AiAgent } from "@/lib/db/schema";

// AI Foundation / Security phase follow-up — this card previously always
// said "No AI agents are configured yet" (a Phase 4 placeholder written
// before the AI Team module existed) regardless of what was actually in
// the ai_agents table, which became actively inaccurate once 8 real agents
// existed. Now reads the same data /ai-team reads and reuses
// getAiAgentExecutionLabel so the two pages can never say different things
// about whether an agent is AI-connected — nothing here implies a live
// generative-AI provider is connected, because none is (see
// src/lib/ai/executionStatus.ts).
export async function AiAgentsCard({ agents }: { agents: AiAgent[] }) {
  const t = await getTranslations("Dashboard");

  const readyForAiConnectionCount = agents.filter(
    (a) => getAiAgentExecutionLabel(a) === "ready_for_ai_connection",
  ).length;
  const preparingCount = agents.length - readyForAiConnectionCount;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        {/* AMS Visual Correction (dashboard icon contrast) — see
            FollowUpTasksCard.tsx for the full rationale: --accent is a
            background wash, not an icon color; --primary replaces it. */}
        <Sparkles className="h-4 w-4 text-primary" />
        <CardTitle>{t("aiAgentsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("aiAgentsComingSoon")}
          </p>
        ) : (
          <>
            <p className="text-sm text-foreground">
              {t("aiAgentsSummary", {
                total: agents.length,
                ready: readyForAiConnectionCount,
                preparing: preparingCount,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("aiAgentsHonestyHint")}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

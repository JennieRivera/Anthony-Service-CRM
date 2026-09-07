import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  listAiAgents,
  getAiAgentWorkloadStats,
  getAiAgentKnowledgeBaseCounts,
} from "@/lib/queries/aiAgents";
import { AiAgentCard } from "@/components/ai-team/AiAgentCard";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import { toggleAiAgentPauseAction } from "./actions";

export default async function AiTeamPage() {
  const t = await getTranslations("AiTeam");
  const configured = isDatabaseConfigured();

  let agents: Awaited<ReturnType<typeof listAiAgents>> = [];
  let workload: Awaited<ReturnType<typeof getAiAgentWorkloadStats>> | null =
    null;
  let kbCounts: Awaited<ReturnType<typeof getAiAgentKnowledgeBaseCounts>> =
    new Map();
  let error: string | null = null;

  if (configured) {
    try {
      [agents, workload, kbCounts] = await Promise.all([
        listAiAgents(),
        getAiAgentWorkloadStats(),
        getAiAgentKnowledgeBaseCounts(),
      ]);
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load AI Team: {error}.
        </p>
      )}

      {configured && !error && workload && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => {
            async function pauseAgent() {
              "use server";
              await toggleAiAgentPauseAction(agent.id);
            }

            return (
              <AiAgentCard
                key={agent.id}
                agent={agent}
                stats={workload!.byDepartment.get(agent.department) ?? null}
                openEscalations={
                  workload!.openEscalationsByAgentId.get(agent.id) ?? 0
                }
                knowledgeBaseCount={kbCounts.get(agent.id) ?? 0}
                pauseAction={
                  agent.launchStatus === "active" ? pauseAgent : undefined
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

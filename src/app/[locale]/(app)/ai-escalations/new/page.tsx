import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AiEscalationForm } from "@/components/ai-escalations/AiEscalationForm";
import { listActiveAiAgentsForSelect } from "@/lib/queries/aiEscalations";
import { listClientsForSelect } from "@/lib/queries/cases";
import { listCasesForSelect } from "@/lib/queries/referrals";
import { createAiEscalationAction } from "../actions";

export default async function NewAiEscalationPage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string; clientId?: string; caseId?: string }>;
}) {
  const t = await getTranslations("AiEscalations");
  const { agentId, clientId, caseId } = await searchParams;

  const [agents, clients, cases] = await Promise.all([
    listActiveAiAgentsForSelect(),
    listClientsForSelect(),
    listCasesForSelect(),
  ]);

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("newEscalation")}
        </h1>
        <Link
          href="/ai-escalations"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToEscalations")}
        </Link>
      </div>

      <AiEscalationForm
        agents={agents}
        clients={clients}
        cases={cases}
        defaultAgentId={agentId}
        defaultClientId={clientId}
        defaultCaseId={caseId}
        onSubmit={createAiEscalationAction}
      />
    </div>
  );
}

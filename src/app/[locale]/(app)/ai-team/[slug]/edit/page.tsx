import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAiAgentBySlug } from "@/lib/queries/aiAgents";
import { Link } from "@/i18n/navigation";
import { AiAgentAvatarUploader } from "@/components/ai-team/AiAgentAvatarUploader";
import { AiAgentProfileForm } from "@/components/ai-team/AiAgentProfileForm";
import { AiAgentKnowledgeBaseManager } from "@/components/ai-team/AiAgentKnowledgeBaseManager";
import { updateAiAgentProfileAction } from "../../actions";
import type { AiAgentProfileFormValues } from "@/lib/validation/aiAgent";

export default async function AiAgentEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("AiTeam");

  const result = await getAiAgentBySlug(slug);
  if (!result) notFound();
  const { agent, knowledgeBase } = result;

  async function submit(values: AiAgentProfileFormValues) {
    "use server";
    await updateAiAgentProfileAction(agent.id, values);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {agent.name}
        </h1>
        <Link
          href={`/ai-team/${agent.slug}`}
          className="text-sm text-muted-foreground underline"
        >
          &larr; {agent.name}
        </Link>
      </div>

      <AiAgentAvatarUploader agent={agent} />

      <AiAgentProfileForm agent={agent} onSubmit={submit} />

      <AiAgentKnowledgeBaseManager agentId={agent.id} entries={knowledgeBase} />

      <p className="text-xs text-muted-foreground">{t("editHint")}</p>
    </div>
  );
}

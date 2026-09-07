import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAiAgentBySlug } from "@/lib/queries/aiAgents";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiAgentAvatar } from "@/components/ai-team/AiAgentAvatar";

export default async function AiAgentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("AiTeam");
  const tStatus = await getTranslations("AiAgentStatus");
  const tDepartment = await getTranslations("AiAgentDepartment");
  const tLanguage = await getTranslations("AiAgentLanguage");
  const tSection = await getTranslations("AiKnowledgeBaseSection");

  const result = await getAiAgentBySlug(slug);
  if (!result) notFound();
  const { agent, knowledgeBase } = result;
  const isComingSoon = agent.launchStatus === "coming_soon";

  const kbBySection = new Map<string, typeof knowledgeBase>();
  for (const entry of knowledgeBase) {
    const list = kbBySection.get(entry.section) ?? [];
    list.push(entry);
    kbBySection.set(entry.section, list);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/ai-team"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToAiTeam")}
        </Link>
        <Button render={<Link href={`/ai-team/${agent.slug}/edit`} />}>
          <Pencil className="h-4 w-4" />
          {t("settings")}
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-start">
        <AiAgentAvatar
          style={agent.avatarStyle}
          accentColor={agent.accentColor ?? "#3A86FF"}
          agentId={agent.id}
          hasUploadedImage={Boolean(agent.avatarUrl)}
          dimmed={isComingSoon}
          size={96}
        />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl text-foreground">
              {agent.name}
            </h1>
            <Badge variant="secondary">{t("aiAssistantBadge")}</Badge>
            {isComingSoon && (
              <Badge variant="outline">{t("comingSoonBadge")}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">{agent.title}</p>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">{t("department")}</p>
              <p className="text-foreground">
                {tDepartment(agent.department)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("language")}</p>
              <p className="text-foreground">{tLanguage(agent.language)}</p>
            </div>
            {!isComingSoon && (
              <div>
                <p className="text-muted-foreground">{t("status")}</p>
                <p className="text-foreground">{tStatus(agent.status)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isComingSoon ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
          {t("comingSoonMessage")}
        </p>
      ) : (
        <>
          {agent.bio && (
            <div className="rounded-lg border border-border bg-card p-6 text-sm">
              <p className="text-muted-foreground">{t("bio")}</p>
              <p className="mt-1 text-foreground">{agent.bio}</p>
            </div>
          )}

          {agent.welcomeMessage && (
            <div className="rounded-lg border border-border bg-card p-6 text-sm">
              <p className="text-muted-foreground">{t("welcomeMessage")}</p>
              <p className="mt-1 text-foreground italic">
                “{agent.welcomeMessage}”
              </p>
            </div>
          )}

          {agent.disclaimerText && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
              <p className="font-medium">{t("disclaimer")}</p>
              <p className="mt-1">{agent.disclaimerText}</p>
            </div>
          )}

          {knowledgeBase.length > 0 && (
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
              <h2 className="font-heading text-lg text-foreground">
                {t("knowledgeBaseEntries")}
              </h2>
              {Array.from(kbBySection.entries()).map(([section, entries]) => (
                <div key={section} className="flex flex-col gap-2">
                  <Badge variant="outline" className="w-fit">
                    {tSection(section)}
                  </Badge>
                  {entries!.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-md border border-border p-3 text-sm"
                    >
                      <p className="font-medium text-foreground">
                        {entry.title}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {entry.content}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

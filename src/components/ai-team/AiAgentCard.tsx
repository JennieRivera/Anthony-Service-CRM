import { useTranslations } from "next-intl";
import { Pause, Play, Settings, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AiAgentAvatar } from "./AiAgentAvatar";
import type { AiAgent } from "@/lib/db/schema";

const STATUS_DOT_CLASSES: Record<string, string> = {
  online: "bg-emerald-500",
  offline: "bg-muted-foreground",
  paused: "bg-amber-500",
  needs_review: "bg-amber-500",
  escalated: "bg-destructive",
};

const PERMISSION_KEYS = [
  "canRead",
  "canWrite",
  "canCreateTask",
  "canCreateNote",
  "canChangeStatus",
  "canSendDraft",
  "canSendMessage",
  "canEscalate",
] as const;

export function AiAgentCard({
  agent,
  stats,
  openEscalations,
  knowledgeBaseCount,
  pauseAction,
}: {
  agent: AiAgent;
  stats: { assignedClients: number; tasksToday: number } | null;
  openEscalations: number;
  knowledgeBaseCount: number;
  pauseAction?: () => Promise<void>;
}) {
  const t = useTranslations("AiTeam");
  const tStatus = useTranslations("AiAgentStatus");
  const tDepartment = useTranslations("AiAgentDepartment");
  const tLanguage = useTranslations("AiAgentLanguage");

  const isComingSoon = agent.launchStatus === "coming_soon";
  const activePermissions = PERMISSION_KEYS.filter((key) => agent[key]).length;

  return (
    <Card className={cn(isComingSoon && "opacity-70")}>
      <CardHeader className="flex flex-row items-start gap-4">
        <AiAgentAvatar
          style={agent.avatarStyle}
          accentColor={agent.accentColor ?? "#3A86FF"}
          dimmed={isComingSoon}
        />
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-lg text-foreground">
              {agent.name}
            </h3>
            {!isComingSoon && (
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  STATUS_DOT_CLASSES[agent.status],
                )}
                aria-hidden="true"
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground">{agent.title}</p>
          <Badge variant="secondary" className="w-fit">
            {t("aiAssistantBadge")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {isComingSoon ? (
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit">
              {t("comingSoonBadge")}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {t("comingSoonMessage")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("department")}: {tDepartment(agent.department)}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <div>
                <p className="text-muted-foreground">{t("department")}</p>
                <p className="text-foreground">
                  {tDepartment(agent.department)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("language")}</p>
                <p className="text-foreground">
                  {tLanguage(agent.language)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("status")}</p>
                <p className="text-foreground">{tStatus(agent.status)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t("knowledgeBaseEntries")}
                </p>
                <p className="text-foreground">
                  {t("knowledgeBaseEntriesCount", { count: knowledgeBaseCount })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-center">
              <div>
                <p className="text-lg font-medium text-foreground">
                  {stats?.assignedClients ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("assignedClients")}
                </p>
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">
                  {stats?.tasksToday ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("tasksToday")}
                </p>
              </div>
              <div>
                <p
                  className={cn(
                    "text-lg font-medium",
                    openEscalations > 0
                      ? "text-destructive"
                      : "text-foreground",
                  )}
                >
                  {openEscalations}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("openEscalations")}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {t("activePermissions", {
                active: activePermissions,
                total: PERMISSION_KEYS.length,
              })}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                render={<Link href={`/ai-team/${agent.slug}`} />}
              >
                <ExternalLink className="h-4 w-4" />
                {t("openAgent")}
              </Button>

              {pauseAction && (
                <form action={pauseAction}>
                  <Button type="submit" size="sm" variant="outline">
                    {agent.status === "paused" ? (
                      <>
                        <Play className="h-4 w-4" />
                        {t("resumeAgent")}
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4" />
                        {t("pauseAgent")}
                      </>
                    )}
                  </Button>
                </form>
              )}

              <Button size="sm" variant="ghost" disabled title={t("settingsComingSoon")}>
                <Settings className="h-4 w-4" />
                {t("settings")}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

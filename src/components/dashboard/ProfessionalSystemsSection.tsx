import { getTranslations } from "next-intl/server";
import { ExternalLink, Settings } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProfessionalSystem } from "@/lib/db/schema";

export async function ProfessionalSystemsSection({
  systems,
}: {
  systems: ProfessionalSystem[];
}) {
  const t = await getTranslations("ProfessionalSystems");
  const tConnStatus = await getTranslations("ProfessionalSystemConnectionStatus");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("dashboardTitle")}</CardTitle>
        <Button
          size="sm"
          variant="outline"
          render={<Link href="/settings/professional-systems" />}
        >
          <Settings className="h-3.5 w-3.5" />
          {t("manage")}
        </Button>
      </CardHeader>
      <CardContent>
        {systems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noneActive")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {systems.map((system) => {
              const card = (
                <div className="flex h-full flex-col gap-2 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{system.icon || "🔗"}</span>
                    <span className="font-medium text-foreground">
                      {system.name}
                    </span>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    {tConnStatus(system.connectionStatus)}
                  </Badge>
                  {system.url && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      {t("openSystem")}
                    </span>
                  )}
                </div>
              );
              return system.url ? (
                <a
                  key={system.id}
                  href={system.url}
                  target={system.openInNewTab ? "_blank" : undefined}
                  rel="noopener noreferrer"
                >
                  {card}
                </a>
              ) : (
                <div key={system.id}>{card}</div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

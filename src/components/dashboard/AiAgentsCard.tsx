import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Phase 4, Session 8 — placeholder per explicit decision: no AI agent
// module exists in this CRM yet, so this is a "coming soon" card rather
// than a functional section, ready to be replaced once agents are defined.
export async function AiAgentsCard() {
  const t = await getTranslations("Dashboard");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <CardTitle>{t("aiAgentsTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {t("aiAgentsComingSoon")}
        </p>
      </CardContent>
    </Card>
  );
}

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RISK_CLASSES: Record<string, string> = {
  low: "border-border text-foreground bg-transparent",
  medium: "border-transparent bg-accent/20 text-foreground",
  high: "border-transparent bg-amber-500/20 text-amber-900",
  critical: "border-transparent bg-destructive text-destructive-foreground",
};

export function AiEscalationRiskBadge({ riskLevel }: { riskLevel: string }) {
  const t = useTranslations("AiEscalationRiskLevel");
  return (
    <Badge className={cn(RISK_CLASSES[riskLevel] ?? RISK_CLASSES.medium)}>
      {t(riskLevel)}
    </Badge>
  );
}

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Phase 1.5D — "resolved" is a genuine terminal/positive outcome, so it
// uses the semantic --success token. "closed" stays unstyled/muted — a
// closed escalation isn't necessarily one that was successfully resolved.
const STATUS_CLASSES: Record<string, string> = {
  open: "border-border text-foreground bg-transparent",
  in_progress: "border-transparent bg-accent/20 text-foreground",
  resolved: "border-transparent bg-success text-success-foreground",
  closed: "border-border text-muted-foreground bg-transparent",
};

export function AiEscalationStatusBadge({ status }: { status: string }) {
  const t = useTranslations("AiEscalationStatus");
  return (
    <Badge className={cn(STATUS_CLASSES[status] ?? STATUS_CLASSES.open)}>
      {t(status)}
    </Badge>
  );
}

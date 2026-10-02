import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Phase 1.5D — "completed" is a genuine terminal/positive outcome, so it
// uses the semantic --success token. "pending_follow_up" stays its
// existing hardcoded amber — out of scope (no warning color was part of
// this rebrand), left untouched.
const statusClasses: Record<string, string> = {
  new: "border-border text-foreground bg-transparent",
  read: "border-border text-muted-foreground bg-transparent",
  replied: "border-transparent bg-accent/20 text-foreground",
  pending_follow_up: "border-amber-300 bg-amber-50 text-amber-900",
  completed: "border-transparent bg-success text-success-foreground",
  archived: "border-border text-muted-foreground bg-transparent",
};

export function CommunicationStatusBadge({ status }: { status: string }) {
  const t = useTranslations("CommunicationStatus");
  return (
    <Badge className={cn(statusClasses[status] ?? statusClasses.new)}>
      {t(status)}
    </Badge>
  );
}

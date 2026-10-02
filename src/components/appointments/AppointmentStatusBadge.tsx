import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Phase 1.5D — "confirmed"/"checked_in" are operational/ready states, not
// completions, so they stay on --primary. "completed" is a genuine
// terminal outcome and now uses the semantic --success token — this also
// fixes a pre-existing inconsistency where it was hardcoded to a raw
// Tailwind emerald instead of a theme token (so it wasn't dark-mode-aware).
const STATUS_CLASSES: Record<string, string> = {
  requested: "border-border text-foreground bg-transparent",
  scheduled: "border-transparent bg-accent/20 text-foreground",
  confirmed: "border-transparent bg-primary text-primary-foreground",
  checked_in: "border-transparent bg-primary text-primary-foreground",
  in_progress: "border-transparent bg-accent/20 text-foreground",
  completed: "border-transparent bg-success text-success-foreground",
  no_show: "border-transparent bg-destructive text-destructive-foreground",
  rescheduled: "border-border text-muted-foreground bg-transparent",
  cancelled: "border-border text-muted-foreground bg-transparent",
};

export function AppointmentStatusBadge({ status }: { status: string }) {
  const t = useTranslations("AppointmentStatus");
  return (
    <Badge className={cn(STATUS_CLASSES[status] ?? STATUS_CLASSES.scheduled)}>
      {t(status)}
    </Badge>
  );
}

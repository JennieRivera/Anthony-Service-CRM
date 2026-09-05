import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  new: "border-border text-foreground bg-transparent",
  read: "border-border text-muted-foreground bg-transparent",
  replied: "border-transparent bg-accent/20 text-foreground",
  pending_follow_up: "border-amber-300 bg-amber-50 text-amber-900",
  completed: "border-transparent bg-primary text-primary-foreground",
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

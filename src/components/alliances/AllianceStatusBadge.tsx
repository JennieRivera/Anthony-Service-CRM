import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  prospect: "border-border text-foreground bg-transparent",
  contacted: "border-transparent bg-accent/20 text-foreground",
  meeting_scheduled: "border-transparent bg-accent/20 text-foreground",
  under_discussion: "border-transparent bg-accent/20 text-foreground",
  agreement_review: "border-transparent bg-accent/20 text-foreground",
  active_partner: "border-transparent bg-primary text-primary-foreground",
  paused: "border-border text-muted-foreground bg-transparent",
  inactive: "border-border text-muted-foreground bg-transparent",
};

export function AllianceStatusBadge({ status }: { status: string }) {
  const t = useTranslations("AllianceStatus");
  return (
    <Badge className={cn(statusClasses[status] ?? statusClasses.prospect)}>
      {t(status)}
    </Badge>
  );
}

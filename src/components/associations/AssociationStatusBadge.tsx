import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  research: "border-border text-muted-foreground bg-transparent",
  prospect: "border-border text-foreground bg-transparent",
  contacted: "border-transparent bg-accent/20 text-foreground",
  meeting_scheduled: "border-transparent bg-accent/20 text-foreground",
  member: "border-transparent bg-primary text-primary-foreground",
  strategic_partner: "border-transparent bg-primary text-primary-foreground",
  inactive: "border-border text-muted-foreground bg-transparent",
};

export function AssociationStatusBadge({ status }: { status: string }) {
  const t = useTranslations("AssociationRelationshipStatus");
  return (
    <Badge className={cn(statusClasses[status] ?? statusClasses.research)}>
      {t(status)}
    </Badge>
  );
}

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  lead: "border-border text-muted-foreground bg-transparent",
  registered: "border-border text-foreground bg-transparent",
  payment_pending: "border-transparent bg-accent/20 text-foreground",
  enrolled: "border-transparent bg-accent/20 text-foreground",
  active_student: "border-transparent bg-primary text-primary-foreground",
  in_progress: "border-transparent bg-primary text-primary-foreground",
  completed: "border-transparent bg-primary text-primary-foreground",
  certificate_pending: "border-transparent bg-accent/20 text-foreground",
  certified: "border-transparent bg-primary text-primary-foreground",
  inactive: "border-border text-muted-foreground bg-transparent",
};

export function AcademyStatusBadge({ status }: { status: string }) {
  const t = useTranslations("AcademyCaseStatus");
  return (
    <Badge className={cn(statusClasses[status] ?? statusClasses.lead)}>
      {t(status)}
    </Badge>
  );
}

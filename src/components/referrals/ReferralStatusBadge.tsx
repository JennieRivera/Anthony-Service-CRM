import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  submitted: "border-border text-foreground bg-transparent",
  in_progress: "border-transparent bg-accent/20 text-foreground",
  closed_won: "border-transparent bg-primary text-primary-foreground",
  closed_lost: "border-border text-muted-foreground bg-transparent",
};

export function ReferralStatusBadge({ status }: { status: string }) {
  const t = useTranslations("ReferralStatus");
  return (
    <Badge className={cn(statusClasses[status] ?? statusClasses.submitted)}>
      {t(status)}
    </Badge>
  );
}

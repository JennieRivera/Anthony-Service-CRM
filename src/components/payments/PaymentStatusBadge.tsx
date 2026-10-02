import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Phase 1.5D — "paid" is a genuine terminal/positive outcome, so it uses
// the semantic --success token instead of --primary.
const statusClasses: Record<string, string> = {
  unpaid: "border-border text-foreground bg-transparent",
  partial: "border-transparent bg-accent/20 text-foreground",
  paid: "border-transparent bg-success text-success-foreground",
  overdue: "border-transparent bg-destructive/10 text-destructive",
  refunded: "border-border text-muted-foreground bg-transparent",
  cancelled: "border-border text-muted-foreground bg-transparent",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  const t = useTranslations("PaymentStatus");
  return (
    <Badge className={cn(statusClasses[status] ?? statusClasses.unpaid)}>
      {t(status)}
    </Badge>
  );
}

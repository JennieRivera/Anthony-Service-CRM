import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  unpaid: "border-border text-foreground bg-transparent",
  partial: "border-transparent bg-accent/20 text-foreground",
  paid: "border-transparent bg-primary text-primary-foreground",
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

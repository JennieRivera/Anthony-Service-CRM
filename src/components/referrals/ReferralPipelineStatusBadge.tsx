import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  new_referral: "border-border text-foreground bg-transparent",
  registered: "border-border text-foreground bg-transparent",
  consent_pending: "border-transparent bg-accent/20 text-foreground",
  sent_to_partner: "border-transparent bg-accent/20 text-foreground",
  under_review: "border-transparent bg-accent/20 text-foreground",
  documents_pending: "border-transparent bg-accent/20 text-foreground",
  qualified: "border-transparent bg-accent/20 text-foreground",
  service_in_progress: "border-transparent bg-accent/20 text-foreground",
  closed_funded: "border-transparent bg-primary text-primary-foreground",
  commission_due: "border-transparent bg-primary text-primary-foreground",
  commission_paid: "border-transparent bg-primary text-primary-foreground",
  declined: "border-border text-muted-foreground bg-transparent",
  cancelled: "border-border text-muted-foreground bg-transparent",
};

export function ReferralPipelineStatusBadge({ status }: { status: string }) {
  const t = useTranslations("ReferralPipelineStatus");
  return (
    <Badge className={cn(statusClasses[status] ?? statusClasses.new_referral)}>
      {t(status)}
    </Badge>
  );
}

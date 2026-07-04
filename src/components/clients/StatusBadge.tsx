import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { clientStatusEnum, caseStatusEnum } from "@/lib/db/schema";

type ClientStatus = (typeof clientStatusEnum.enumValues)[number];
type CaseStatus = (typeof caseStatusEnum.enumValues)[number];

const clientStatusClasses: Record<ClientStatus, string> = {
  lead: "border-border text-muted-foreground bg-transparent",
  active: "border-transparent bg-primary text-primary-foreground",
  in_progress: "border-transparent bg-accent text-accent-foreground",
  completed: "border-transparent bg-secondary text-secondary-foreground",
  follow_up: "border-border text-foreground bg-transparent",
};

const caseStatusClasses: Record<CaseStatus, string> = {
  new: "border-border text-muted-foreground bg-transparent",
  in_progress: "border-transparent bg-accent text-accent-foreground",
  waiting_on_client: "border-border text-foreground bg-transparent",
  completed: "border-transparent bg-primary text-primary-foreground",
  cancelled: "border-transparent bg-destructive/10 text-destructive",
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const t = useTranslations("ClientStatus");
  return (
    <Badge className={cn(clientStatusClasses[status])}>{t(status)}</Badge>
  );
}

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const t = useTranslations("CaseStatus");
  return <Badge className={cn(caseStatusClasses[status])}>{t(status)}</Badge>;
}

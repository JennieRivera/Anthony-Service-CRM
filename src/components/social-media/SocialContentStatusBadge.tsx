import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  idea: "border-border text-muted-foreground bg-transparent",
  draft: "border-border text-foreground bg-transparent",
  in_review: "border-transparent bg-accent/20 text-foreground",
  approved: "border-transparent bg-accent/20 text-foreground",
  scheduled: "border-transparent bg-accent/20 text-foreground",
  published: "border-transparent bg-primary text-primary-foreground",
  archived: "border-border text-muted-foreground bg-transparent",
};

export function SocialContentStatusBadge({ status }: { status: string }) {
  const t = useTranslations("SocialContentStatus");
  return (
    <Badge className={cn(statusClasses[status] ?? statusClasses.idea)}>
      {t(status)}
    </Badge>
  );
}

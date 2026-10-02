import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Phase 1.5D — "approved" and "published" are genuine terminal/positive
// outcomes and move to the semantic --success token ("approved" was
// previously the same generic accent/20 wash as "in_review"/"scheduled",
// which didn't actually distinguish it as a positive outcome at all).
const statusClasses: Record<string, string> = {
  idea: "border-border text-muted-foreground bg-transparent",
  draft: "border-border text-foreground bg-transparent",
  in_review: "border-transparent bg-accent/20 text-foreground",
  approved: "border-transparent bg-success text-success-foreground",
  scheduled: "border-transparent bg-accent/20 text-foreground",
  published: "border-transparent bg-success text-success-foreground",
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

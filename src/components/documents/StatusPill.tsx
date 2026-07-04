import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

export function DocumentStatusPill({
  status,
}: {
  status: "pending" | "received" | "submitted" | "returned" | null;
}) {
  const t = useTranslations("DocumentStatus");
  if (!status) return <span className="text-muted-foreground">—</span>;
  return <Badge variant="outline">{t(status)}</Badge>;
}

import { getTranslations } from "next-intl/server";
import { UserPlus, Briefcase, Receipt, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActivityItem = {
  id: string;
  type: "client" | "case" | "invoice" | "document";
  label: string;
  timestamp: Date;
};

const icons = {
  client: UserPlus,
  case: Briefcase,
  invoice: Receipt,
  document: FileText,
} as const;

export async function RecentActivity({ items }: { items: ActivityItem[] }) {
  const t = await getTranslations("Dashboard");

  const labels: Record<ActivityItem["type"], string> = {
    client: t("activityClient"),
    case: t("activityCase"),
    invoice: t("activityInvoice"),
    document: t("activityDocument"),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recentActivity")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
        )}
        {items.map((item) => {
          const Icon = icons[item.type];
          return (
            <div key={`${item.type}-${item.id}`} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="flex flex-col">
                <span className="text-sm text-foreground">
                  {labels[item.type]}: {item.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.timestamp.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

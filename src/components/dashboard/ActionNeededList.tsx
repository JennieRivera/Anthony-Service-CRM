import { getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Invoice, Case } from "@/lib/db/schema";

export async function ActionNeededList({
  overdueInvoices,
  stalledCases,
}: {
  overdueInvoices: Invoice[];
  stalledCases: Case[];
}) {
  const t = await getTranslations("Dashboard");
  const hasItems = overdueInvoices.length > 0 || stalledCases.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("actionNeeded")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!hasItems && (
          <p className="text-sm text-muted-foreground">
            {t("noActionNeeded")}
          </p>
        )}
        {overdueInvoices.map((inv) => (
          <Link
            key={inv.id}
            href={`/invoices/${inv.id}`}
            className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 transition-colors hover:bg-destructive/10"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {t("overdueInvoice")}: INV-
                {String(inv.invoiceSeq).padStart(5, "0")}
              </span>
              <span className="text-xs text-muted-foreground">
                ${Number(inv.total).toFixed(2)}
              </span>
            </div>
          </Link>
        ))}
        {stalledCases.map((c) => (
          <Link
            key={c.id}
            href={`/cases/${c.id}`}
            className="flex items-start gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {t("stalledCase")}: {c.title}
              </span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

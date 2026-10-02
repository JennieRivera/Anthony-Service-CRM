import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/dates";
import type { Invoice, Payment } from "@/lib/db/schema";

// Phase 2G — read-only, reuses the client's existing invoices/payments
// rows (real clientId/invoiceId FKs — see getClientById), never a second
// billing system and never a name-matched guess. Deliberately labeled as
// this CLIENT's full invoice/payment history (which may span other
// services, not only this Academy enrollment) — the enrollment-specific
// balance shown in StudentAdministrativeSummary is a separate, narrower
// number computed from invoices whose caseId matches this one enrollment.
export async function StudentFinanceList({
  invoices,
  payments,
  outstandingBalance,
}: {
  invoices: Invoice[];
  payments: Payment[];
  outstandingBalance: number;
}) {
  const t = await getTranslations("AcademyStudent360");
  const tInvoiceStatus = await getTranslations("InvoiceStatus");

  const paymentsByInvoiceId = new Map<string, Payment[]>();
  for (const p of payments) {
    const list = paymentsByInvoiceId.get(p.invoiceId) ?? [];
    list.push(p);
    paymentsByInvoiceId.set(p.invoiceId, list);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground">
        {t("clientWideOutstandingBalance")}: ${outstandingBalance.toFixed(2)}
      </p>
      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noInvoices")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {invoices.slice(0, 10).map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2.5 text-sm">
              <Link href={`/invoices/${inv.id}`} className="text-foreground underline">
                INV-{String(inv.invoiceSeq).padStart(5, "0")}
              </Link>
              <Badge variant="outline">{tInvoiceStatus(inv.status)}</Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(inv.issueDate)} · ${Number(inv.total).toFixed(2)}
              </span>
              {(paymentsByInvoiceId.get(inv.id) ?? []).map((p) => (
                <Link
                  key={p.id}
                  href={`/payments/${p.id}`}
                  className="text-xs text-muted-foreground underline"
                >
                  {t("payment")}: ${Number(p.amountPaid).toFixed(2)}
                </Link>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

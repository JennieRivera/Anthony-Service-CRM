import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import type { listInvoicesWithClient } from "@/lib/queries/invoices";

export async function InvoiceTable({
  invoices,
}: {
  invoices: Awaited<ReturnType<typeof listInvoicesWithClient>>;
}) {
  const t = await getTranslations("Invoices");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnNumber")}</TableHead>
            <TableHead>{t("columnClient")}</TableHead>
            <TableHead>{t("columnIssueDate")}</TableHead>
            <TableHead>{t("columnDueDate")}</TableHead>
            <TableHead>{t("columnTotal")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  INV-{String(invoice.invoiceSeq).padStart(5, "0")}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/clients/${invoice.clientId}`}
                  className="text-muted-foreground hover:underline"
                >
                  {invoice.clientName}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(invoice.issueDate).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {invoice.dueDate
                  ? new Date(invoice.dueDate).toLocaleDateString()
                  : "—"}
              </TableCell>
              <TableCell className="font-medium text-foreground">
                ${Number(invoice.total).toFixed(2)}
              </TableCell>
              <TableCell>
                <InvoiceStatusBadge status={invoice.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

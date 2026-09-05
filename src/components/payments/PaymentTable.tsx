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
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import type { listPaymentsWithInvoice } from "@/lib/queries/payments";

export async function PaymentTable({
  payments,
}: {
  payments: Awaited<ReturnType<typeof listPaymentsWithInvoice>>;
}) {
  const t = await getTranslations("Payments");
  const tRefund = await getTranslations("RefundStatus");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnInvoice")}</TableHead>
            <TableHead>{t("columnClient")}</TableHead>
            <TableHead>{t("columnTotal")}</TableHead>
            <TableHead>{t("columnPaid")}</TableHead>
            <TableHead>{t("columnBalance")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("columnRefund")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                <Link
                  href={`/payments/${payment.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  INV-{String(payment.invoiceSeq).padStart(5, "0")}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/invoices/${payment.invoiceId}`}
                  className="text-muted-foreground hover:underline"
                >
                  {payment.clientName}
                </Link>
              </TableCell>
              <TableCell className="text-foreground">
                ${Number(payment.amountTotal).toFixed(2)}
              </TableCell>
              <TableCell className="text-foreground">
                ${Number(payment.amountPaid).toFixed(2)}
              </TableCell>
              <TableCell className="font-medium text-foreground">
                ${Number(payment.balanceDue).toFixed(2)}
              </TableCell>
              <TableCell>
                <PaymentStatusBadge status={payment.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tRefund(payment.refundStatus)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

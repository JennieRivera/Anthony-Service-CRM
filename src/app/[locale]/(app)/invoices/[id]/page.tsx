import { notFound } from "next/navigation";
import { Download, Ban } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getInvoiceById } from "@/lib/queries/invoices";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { MarkAsPaidDialog } from "@/components/invoices/MarkAsPaidDialog";
import { cancelInvoiceAction } from "../actions";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Invoices");

  const result = await getInvoiceById(id);
  if (!result) notFound();

  const { invoice, client, caseTitle, lineItems } = result;
  const invoiceNumber = `INV-${String(invoice.invoiceSeq).padStart(5, "0")}`;

  async function cancelInvoice() {
    "use server";
    await cancelInvoiceAction(id);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/invoices"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToInvoices")}
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" render={<a href={`/api/invoices/${id}/pdf`} />}>
            <Download className="h-4 w-4" />
            {t("downloadPdf")}
          </Button>
          {invoice.status === "unpaid" && (
            <MarkAsPaidDialog invoiceId={id} />
          )}
          {invoice.status !== "cancelled" && invoice.status !== "paid" && (
            <form action={cancelInvoice}>
              <Button type="submit" variant="outline">
                <Ban className="h-4 w-4" />
                {t("cancelInvoice")}
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl text-foreground">
            {invoiceNumber}
          </h1>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t("columnClient")}</p>
            <Link
              href={`/clients/${client.id}`}
              className="text-foreground hover:underline"
            >
              {client.fullName}
            </Link>
          </div>
          <div>
            <p className="text-muted-foreground">{t("columnIssueDate")}</p>
            <p className="text-foreground">
              {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("columnDueDate")}</p>
            <p className="text-foreground">
              {invoice.dueDate
                ? new Date(invoice.dueDate).toLocaleDateString()
                : "—"}
            </p>
          </div>
          {caseTitle && (
            <div>
              <p className="text-muted-foreground">Case</p>
              <p className="text-foreground">{caseTitle}</p>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("form.description")}</TableHead>
              <TableHead>{t("form.quantity")}</TableHead>
              <TableHead>{t("form.unitPrice")}</TableHead>
              <TableHead>{t("form.lineTotal")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell>{Number(item.quantity)}</TableCell>
                <TableCell>${Number(item.unitPrice).toFixed(2)}</TableCell>
                <TableCell>${Number(item.lineTotal).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-end gap-1 text-sm">
        <div className="flex gap-8">
          <span className="text-muted-foreground">{t("subtotal")}</span>
          <span className="text-foreground">
            ${Number(invoice.subtotal).toFixed(2)}
          </span>
        </div>
        <div className="flex gap-8 text-lg font-medium">
          <span>{t("total")}</span>
          <span>${Number(invoice.total).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

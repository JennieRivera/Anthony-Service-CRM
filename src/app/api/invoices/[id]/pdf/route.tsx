import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { getInvoiceById } from "@/lib/queries/invoices";
import { InvoicePdf } from "@/components/invoices/InvoicePdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await getInvoiceById(id);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    <InvoicePdf
      invoice={result.invoice}
      client={result.client}
      lineItems={result.lineItems}
      caseTitle={result.caseTitle}
    />,
  );

  const invoiceNumber = `INV-${String(result.invoice.invoiceSeq).padStart(5, "0")}`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoiceNumber}.pdf"`,
    },
  });
}

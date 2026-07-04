import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { getReportData } from "@/lib/queries/reports";
import { ReportPdf } from "@/components/reports/ReportPdf";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  const data = await getReportData(fromDate, toDate);

  const buffer = await renderToBuffer(
    <ReportPdf
      from={from}
      to={to}
      totalRevenue={data.totalRevenue}
      newClients={data.newClients}
      newCases={data.newCases}
      avgTurnaroundDays={data.avgTurnaroundDays}
      revenueByService={data.revenueByService}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report_${from}_to_${to}.pdf"`,
    },
  });
}

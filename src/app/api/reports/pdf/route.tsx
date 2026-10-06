import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { getReportData } from "@/lib/queries/reports";
import { ReportPdf } from "@/components/reports/ReportPdf";
import { addDays, businessLocalToUtc } from "@/lib/dates";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  // Whole Florida days, same range as the Reports page.
  const fromDate = businessLocalToUtc(from);
  const toDate = new Date(businessLocalToUtc(addDays(to, 1)).getTime() - 1);

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

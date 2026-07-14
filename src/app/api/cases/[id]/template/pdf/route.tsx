import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { getCaseById } from "@/lib/queries/cases";
import { CaseTemplatePdf } from "@/components/documents/CaseTemplatePdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await getCaseById(id);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    <CaseTemplatePdf
      caseRecord={result.case}
      client={result.client}
      notaryEntry={result.notaryEntries[0] ?? null}
    />,
  );

  const safeTitle = result.case.title.replace(/[^a-z0-9]+/gi, "-");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="template-${safeTitle}.pdf"`,
    },
  });
}

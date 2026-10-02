import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { getCertificateById, formatCertificateNumber } from "@/lib/queries/academyCertificates";
import { CertificatePdf } from "@/components/academy/CertificatePdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const certificate = await getCertificateById(id);
  if (!certificate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(<CertificatePdf certificate={certificate} />);
  const certificateNumber = formatCertificateNumber(certificate.certificateSeq, certificate.issueDate);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificateNumber}.pdf"`,
    },
  });
}

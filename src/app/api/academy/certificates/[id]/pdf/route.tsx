import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { routing } from "@/i18n/routing";
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

  const requested = new URL(request.url).searchParams.get("locale");
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "CertificatePdf" });
  const labels = {
    revoked: t("revoked"),
    heading: t("heading"),
    certifies: t("certifies"),
    completed: t("completed"),
    issueDate: t("issueDate"),
    completionDate: t("completionDate"),
    authorizedSignature: t("authorizedSignature"),
    certificateNumber: t("certificateNumber"),
  };

  const buffer = await renderToBuffer(
    <CertificatePdf certificate={certificate} labels={labels} locale={locale} />,
  );
  const certificateNumber = formatCertificateNumber(certificate.certificateSeq, certificate.issueDate);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificateNumber}.pdf"`,
    },
  });
}

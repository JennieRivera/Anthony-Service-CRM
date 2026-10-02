import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { getCertificateById, formatCertificateNumber } from "@/lib/queries/academyCertificates";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CertificatePrintButton } from "@/components/academy/CertificatePrintButton";
import { formatDate } from "@/lib/dates";

export default async function CertificateViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("AcademyCertificates");

  const certificate = await getCertificateById(id);
  if (!certificate) notFound();

  const certificateNumber = formatCertificateNumber(certificate.certificateSeq, certificate.issueDate);
  const revoked = certificate.status === "revoked";

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/cases/${certificate.enrollmentCaseId}`}
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToEnrollment")}
        </Link>
        <div className="flex gap-2">
          <CertificatePrintButton label={t("print")} />
          <Button
            variant="outline"
            render={<a href={`/api/academy/certificates/${id}/pdf`} />}
          >
            <Download className="h-4 w-4" />
            {t("downloadPdf")}
          </Button>
        </div>
      </div>

      {revoked && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-center text-sm font-medium text-destructive print:hidden">
          {t("revokedBanner")}
          {certificate.revokedReason ? ` — ${certificate.revokedReason}` : ""}
        </div>
      )}

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 border-4 border-[#C8A96B] bg-[#F6F5F0] p-12 text-center shadow-sm print:border-4 print:border-[#C8A96B] print:bg-white print:shadow-none">
        {revoked && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rotate-[-18deg] text-6xl font-bold text-destructive/20 select-none">
              {t("revokedWatermark")}
            </span>
          </div>
        )}

        <p className="font-heading text-2xl tracking-wide text-[#1C2B3E]">
          Anthony Multiservice Academy
        </p>
        <p className="text-sm uppercase tracking-[0.2em] text-[#5B6672]">
          {t("certificateHeading")}
        </p>

        <p className="mt-4 text-sm text-[#5B6672]">{t("thisCertifiesThat")}</p>
        <p className="font-heading text-3xl text-[#477297]">
          {certificate.studentNameSnapshot}
        </p>
        <p className="text-sm text-[#5B6672]">{t("hasCompleted")}</p>
        <p className="font-heading text-xl text-[#1C2B3E]">
          {certificate.courseNameSnapshot}
          {certificate.programNameSnapshot ? ` — ${certificate.programNameSnapshot}` : ""}
        </p>

        <div className="mt-6 grid w-full grid-cols-2 gap-6 text-sm text-[#1C2B3E]">
          <div>
            <p className="text-xs uppercase text-[#5B6672]">{t("issueDate")}</p>
            <p>{formatDate(certificate.issueDate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-[#5B6672]">{t("completionDate")}</p>
            <p>{certificate.completionDate ? formatDate(certificate.completionDate) : "—"}</p>
          </div>
        </div>

        <div className="mt-8 flex w-full flex-col items-center gap-1 border-t border-[#C8A96B] pt-3">
          <p className="text-sm text-[#1C2B3E]">{certificate.issuedBy}</p>
          <p className="text-xs uppercase tracking-wide text-[#5B6672]">
            {t("authorizedSignature")}
          </p>
        </div>

        <p className="mt-6 text-xs text-[#5B6672]">
          {t("certificateNumber")}: {certificateNumber}
        </p>
      </div>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/dates";
import { IssueCertificateDialog } from "./IssueCertificateDialog";
import { RevokeCertificateDialog } from "./RevokeCertificateDialog";
import type {
  CertificateEligibilityVerdict,
  CertificateRequirements,
} from "@/lib/queries/academyCertificates";
import type { AcademyCertificate } from "@/lib/db/schema";

const statusClasses: Record<string, string> = {
  draft: "border-border text-muted-foreground bg-transparent",
  issued: "border-transparent bg-success text-success-foreground",
  revoked: "border-transparent bg-destructive text-destructive-foreground",
};

export async function EnrollmentCertificateSection({
  enrollmentCaseId,
  verdict,
  requirements,
  activeCertificate,
  history,
  defaultIssuedBy,
}: {
  enrollmentCaseId: string;
  verdict: CertificateEligibilityVerdict;
  requirements: CertificateRequirements;
  activeCertificate: AcademyCertificate | null;
  history: AcademyCertificate[];
  defaultIssuedBy: string;
}) {
  const t = await getTranslations("AcademyCertificates");
  const tStatus = await getTranslations("AcademyCertificateStatus");

  const revokedHistory = history.filter((c) => c.id !== activeCertificate?.id);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
        {!activeCertificate && (
          <IssueCertificateDialog
            enrollmentCaseId={enrollmentCaseId}
            verdict={verdict}
            requirements={requirements}
            defaultIssuedBy={defaultIssuedBy}
          />
        )}
      </div>

      {!activeCertificate && (
        <p className="text-sm text-foreground">
          {t("eligibilityLabel")}:{" "}
          <span
            className={
              verdict === "eligible"
                ? "text-success font-medium"
                : verdict === "not_eligible"
                  ? "text-destructive font-medium"
                  : "text-muted-foreground font-medium"
            }
          >
            {t(verdict)}
          </span>
        </p>
      )}

      {activeCertificate && (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">
              {t("certificateNumber")}: {activeCertificate.certificateSeq}
            </span>
            <Badge className={statusClasses[activeCertificate.status]}>
              {tStatus(activeCertificate.status)}
            </Badge>
            {activeCertificate.overrideUsed && (
              <Badge variant="outline">{t("overrideBadge")}</Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {t("issueDate")}: {formatDate(activeCertificate.issueDate)}
            {activeCertificate.completionDate
              ? ` · ${t("completionDate")}: ${formatDate(activeCertificate.completionDate)}`
              : ""}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              render={<Link href={`/academy/certificates/${activeCertificate.id}`} />}
            >
              {t("viewCertificate")}
            </Button>
            {activeCertificate.status === "issued" && (
              <RevokeCertificateDialog
                certificateId={activeCertificate.id}
                enrollmentCaseId={enrollmentCaseId}
              />
            )}
          </div>
        </div>
      )}

      {revokedHistory.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">{t("historyTitle")}</p>
          {revokedHistory.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2.5 text-sm"
            >
              <span className="text-foreground">
                {t("certificateNumber")}: {c.certificateSeq}
              </span>
              <Badge className={statusClasses[c.status]}>{tStatus(c.status)}</Badge>
              <span className="text-muted-foreground">
                {formatDate(c.issueDate)}
                {c.revokedAt ? ` · ${t("revokedOn")} ${formatDate(c.revokedAt)}` : ""}
              </span>
              <Link
                href={`/academy/certificates/${c.id}`}
                className="text-muted-foreground underline"
              >
                {t("viewCertificate")}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

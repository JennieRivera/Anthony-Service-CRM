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
import { Badge } from "@/components/ui/badge";
import { ReferralStatusBadge } from "./ReferralStatusBadge";
import type { listReferralsWithClient } from "@/lib/queries/referrals";

export async function ReferralTable({
  referrals,
}: {
  referrals: Awaited<ReturnType<typeof listReferralsWithClient>>;
}) {
  const t = await getTranslations("Referrals");
  const tCategory = await getTranslations("ReferralCategory");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnNumber")}</TableHead>
            <TableHead>{t("columnClient")}</TableHead>
            <TableHead>{t("columnCategory")}</TableHead>
            <TableHead>{t("columnDate")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("columnCommissionDue")}</TableHead>
            <TableHead>{t("columnCommissionPaid")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {referrals.map((referral) => (
            <TableRow key={referral.id}>
              <TableCell>
                <Link
                  href={`/referrals/${referral.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  REF-{String(referral.referralSeq).padStart(5, "0")}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/clients/${referral.clientId}`}
                  className="text-muted-foreground hover:underline"
                >
                  {referral.clientName}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{tCategory(referral.category)}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(referral.referralDate).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <ReferralStatusBadge status={referral.status} />
              </TableCell>
              <TableCell className="font-medium text-foreground">
                {referral.commissionDue
                  ? `$${Number(referral.commissionDue).toFixed(2)}`
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {referral.commissionPaidDate
                  ? new Date(referral.commissionPaidDate).toLocaleDateString()
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

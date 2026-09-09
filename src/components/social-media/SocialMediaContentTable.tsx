import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SocialContentStatusBadge } from "./SocialContentStatusBadge";
import type { listSocialMediaContent } from "@/lib/queries/socialMedia";

export async function SocialMediaContentTable({
  rows,
}: {
  rows: Awaited<ReturnType<typeof listSocialMediaContent>>;
}) {
  const t = await getTranslations("SocialMedia");
  const tPlatform = await getTranslations("SocialMediaPlatform");
  const tContentType = await getTranslations("SocialContentType");

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnId")}</TableHead>
            <TableHead>{t("columnTitle")}</TableHead>
            <TableHead>{t("columnPlatform")}</TableHead>
            <TableHead>{t("columnType")}</TableHead>
            <TableHead>{t("columnScheduled")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("columnApproval")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ content }) => (
            <TableRow key={content.id}>
              <TableCell className="text-muted-foreground">
                SM-{String(content.contentSeq).padStart(5, "0")}
              </TableCell>
              <TableCell>
                <Link
                  href={`/social-media/${content.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {content.title}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tPlatform(content.platform)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tContentType(content.contentType)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {content.scheduledDate
                  ? new Date(content.scheduledDate).toLocaleDateString()
                  : "—"}
              </TableCell>
              <TableCell>
                <SocialContentStatusBadge status={content.status} />
              </TableCell>
              <TableCell>
                {content.approvalRequired && !content.approvedBy ? (
                  <Badge className="border-destructive/40 bg-destructive/10 text-destructive">
                    {t("approvalPending")}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

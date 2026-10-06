import { formatDate, formatDateTime } from "@/lib/dates";
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
import { CommunicationStatusBadge } from "./CommunicationStatusBadge";
import { AUTOMATIC_NOTICE_AUTHOR, CHANNEL_META } from "./channelMeta";
import type { listCommunicationsWithClient } from "@/lib/queries/communications";

export async function CommunicationTable({
  communications,
}: {
  communications: Awaited<ReturnType<typeof listCommunicationsWithClient>>;
}) {
  const t = await getTranslations("Communications");
  const tChannel = await getTranslations("ConversationChannel");
  const tDirection = await getTranslations("ConversationDirection");

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnId")}</TableHead>
            <TableHead>{t("columnDate")}</TableHead>
            <TableHead>{t("columnClient")}</TableHead>
            <TableHead>{t("columnChannel")}</TableHead>
            <TableHead>{t("columnDirection")}</TableHead>
            <TableHead>{t("columnSummary")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("columnFollowUp")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {communications.map((comm) => (
            <TableRow key={comm.id}>
              <TableCell>
                <Link
                  href={`/communications/${comm.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  COM-{String(comm.communicationSeq).padStart(5, "0")}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateTime(comm.occurredAt)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/clients/${comm.clientId}`}
                  className="text-muted-foreground hover:underline"
                >
                  {comm.clientName}
                </Link>
              </TableCell>
              <TableCell>
                <span className="flex flex-wrap items-center gap-1.5">
                  {(() => {
                    const { icon: Icon, color } = CHANNEL_META[comm.channel];
                    return <Icon className={`h-4 w-4 shrink-0 ${color}`} aria-hidden />;
                  })()}
                  <Badge variant="outline">{tChannel(comm.channel)}</Badge>
                  {comm.createdByEmail === AUTOMATIC_NOTICE_AUTHOR && (
                    <Badge variant="secondary">{t("automatic")}</Badge>
                  )}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tDirection(comm.direction)}
              </TableCell>
              <TableCell className="max-w-xs text-foreground">
                <span className="block truncate">{comm.subject || comm.summary}</span>
                {(comm.callOutcome || comm.durationMinutes != null || comm.googleKind) && (
                  <span className="block text-xs text-muted-foreground">
                    {[
                      comm.callOutcome ? t(`callOutcomes.${comm.callOutcome}`) : null,
                      comm.durationMinutes != null ? t("minutes", { minutes: comm.durationMinutes }) : null,
                      comm.googleKind ? t(`googleKinds.${comm.googleKind}`) : null,
                      comm.reviewStars ? "★".repeat(comm.reviewStars) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <CommunicationStatusBadge status={comm.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {comm.followUpRequired
                  ? comm.followUpDate
                    ? formatDate(comm.followUpDate)
                    : t("followUpYes")
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

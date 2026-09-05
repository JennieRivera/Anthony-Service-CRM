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
    <div className="overflow-hidden rounded-lg border border-border bg-card">
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
                {new Date(comm.occurredAt).toLocaleString()}
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
                <Badge variant="outline">{tChannel(comm.channel)}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tDirection(comm.direction)}
              </TableCell>
              <TableCell className="max-w-xs truncate text-foreground">
                {comm.subject || comm.summary}
              </TableCell>
              <TableCell>
                <CommunicationStatusBadge status={comm.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {comm.followUpRequired
                  ? comm.followUpDate
                    ? new Date(comm.followUpDate).toLocaleDateString()
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

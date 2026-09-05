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
import { listWebsiteChatSessions } from "@/lib/queries/socialChannels";
import { listClientsForSelect } from "@/lib/queries/cases";
import { AddWebsiteChatDialog } from "./AddWebsiteChatDialog";
import { WebsiteChatStatusCell } from "./WebsiteChatStatusCell";

export async function WebsiteChatSection() {
  const t = await getTranslations("SocialChannels.websiteChat");
  const tSource = await getTranslations("WebsiteSource");
  const tService = await getTranslations("ServiceType");
  const [sessions, clients] = await Promise.all([
    listWebsiteChatSessions(),
    listClientsForSelect(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <AddWebsiteChatDialog clients={clients} />
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("source")}</TableHead>
                <TableHead>{t("visitor")}</TableHead>
                <TableHead>{t("serviceInterest")}</TableHead>
                <TableHead>{t("message")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("followUpDate")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map(({ session, clientName }) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {tSource(session.websiteSource)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {session.clientId ? (
                      <Link
                        href={`/clients/${session.clientId}`}
                        className="hover:underline"
                      >
                        {clientName}
                      </Link>
                    ) : (
                      session.visitorName || session.visitorEmail || "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {session.serviceInterest
                      ? tService(session.serviceInterest)
                      : "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-foreground">
                    {session.message}
                  </TableCell>
                  <TableCell>
                    <WebsiteChatStatusCell
                      id={session.id}
                      status={session.conversationStatus}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {session.followUpDate
                      ? new Date(session.followUpDate).toLocaleDateString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

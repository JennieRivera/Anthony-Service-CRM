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
import { listFacebookThreads } from "@/lib/queries/socialChannels";
import { listClientsForSelect } from "@/lib/queries/cases";
import { listCasesForSelect } from "@/lib/queries/referrals";
import { AddFacebookThreadDialog } from "./AddFacebookThreadDialog";
import { FacebookThreadStatusCell } from "./FacebookThreadStatusCell";

export async function FacebookThreadsSection() {
  const t = await getTranslations("SocialChannels.facebook");
  const [threads, clients, cases] = await Promise.all([
    listFacebookThreads(),
    listClientsForSelect(),
    listCasesForSelect(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <AddFacebookThreadDialog clients={clients} cases={cases} />
      </div>

      {threads.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("profile")}</TableHead>
                <TableHead>{t("client")}</TableHead>
                <TableHead>{t("service")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("followUpDate")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {threads.map(({ thread, clientName, caseTitle }) => (
                <TableRow key={thread.id}>
                  <TableCell className="font-medium text-foreground">
                    {thread.facebookProfile}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {thread.clientId ? (
                      <Link
                        href={`/clients/${thread.clientId}`}
                        className="hover:underline"
                      >
                        {clientName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {caseTitle ?? "—"}
                  </TableCell>
                  <TableCell>
                    <FacebookThreadStatusCell
                      id={thread.id}
                      status={thread.status}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {thread.followUpDate
                      ? new Date(thread.followUpDate).toLocaleDateString()
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

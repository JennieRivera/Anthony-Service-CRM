import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listAiEscalations } from "@/lib/queries/aiEscalations";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AiEscalationRiskBadge } from "@/components/ai-escalations/AiEscalationRiskBadge";
import { AiEscalationStatusBadge } from "@/components/ai-escalations/AiEscalationStatusBadge";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function AiEscalationsPage() {
  const t = await getTranslations("AiEscalations");
  const configured = isDatabaseConfigured();

  let escalations: Awaited<ReturnType<typeof listAiEscalations>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      escalations = await listAiEscalations();
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <Button render={<Link href="/ai-escalations/new" />}>
          <Plus className="h-4 w-4" />
          {t("newEscalation")}
        </Button>
      </div>

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load AI escalations: {error}.
        </p>
      )}

      {configured &&
        !error &&
        (escalations.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnNumber")}</TableHead>
                  <TableHead>{t("columnAgent")}</TableHead>
                  <TableHead>{t("columnClient")}</TableHead>
                  <TableHead>{t("columnService")}</TableHead>
                  <TableHead>{t("columnRiskLevel")}</TableHead>
                  <TableHead>{t("columnDate")}</TableHead>
                  <TableHead>{t("columnAssignedHuman")}</TableHead>
                  <TableHead>{t("columnStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalations.map((esc) => (
                  <TableRow key={esc.id}>
                    <TableCell>
                      <Link
                        href={`/ai-escalations/${esc.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        ESC-{String(esc.escalationSeq).padStart(5, "0")}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {esc.agentSlug ? (
                        <Link
                          href={`/ai-team/${esc.agentSlug}`}
                          className="hover:underline"
                        >
                          {esc.agentName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {esc.clientId ? (
                        <Link
                          href={`/clients/${esc.clientId}`}
                          className="text-muted-foreground hover:underline"
                        >
                          {esc.clientName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {esc.caseTitle ?? "—"}
                    </TableCell>
                    <TableCell>
                      <AiEscalationRiskBadge riskLevel={esc.riskLevel} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(esc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {esc.assignedHumanEmail ?? "—"}
                    </TableCell>
                    <TableCell>
                      <AiEscalationStatusBadge status={esc.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
    </div>
  );
}

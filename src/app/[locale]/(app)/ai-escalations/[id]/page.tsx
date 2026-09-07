import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAiEscalationById } from "@/lib/queries/aiEscalations";
import { Link } from "@/i18n/navigation";
import { AiEscalationRiskBadge } from "@/components/ai-escalations/AiEscalationRiskBadge";
import { AiEscalationStatusBadge } from "@/components/ai-escalations/AiEscalationStatusBadge";
import { AiEscalationResolutionForm } from "@/components/ai-escalations/AiEscalationResolutionForm";
import { updateAiEscalationResolutionAction } from "../actions";
import type { AiEscalationResolutionFormValues } from "@/lib/validation/aiEscalation";

export default async function AiEscalationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("AiEscalations");

  const result = await getAiEscalationById(id);
  if (!result) notFound();
  const { escalation, agentName, agentSlug, clientName, caseTitle } = result;

  async function submit(values: AiEscalationResolutionFormValues) {
    "use server";
    await updateAiEscalationResolutionAction(id, values);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <Link
        href="/ai-escalations"
        className="text-sm text-muted-foreground underline"
      >
        &larr; {t("backToEscalations")}
      </Link>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl text-foreground">
            ESC-{String(escalation.escalationSeq).padStart(5, "0")}
          </h1>
          <div className="flex items-center gap-2">
            <AiEscalationRiskBadge riskLevel={escalation.riskLevel} />
            <AiEscalationStatusBadge status={escalation.status} />
          </div>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t("form.agent")}</p>
            {agentSlug ? (
              <Link href={`/ai-team/${agentSlug}`} className="text-foreground hover:underline">
                {agentName}
              </Link>
            ) : (
              <p className="text-foreground">—</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.client")}</p>
            {escalation.clientId ? (
              <Link
                href={`/clients/${escalation.clientId}`}
                className="text-foreground hover:underline"
              >
                {clientName}
              </Link>
            ) : (
              <p className="text-foreground">—</p>
            )}
          </div>
          {caseTitle && (
            <div>
              <p className="text-muted-foreground">{t("form.case")}</p>
              {escalation.caseId ? (
                <Link
                  href={`/cases/${escalation.caseId}`}
                  className="text-foreground hover:underline"
                >
                  {caseTitle}
                </Link>
              ) : (
                <p className="text-foreground">{caseTitle}</p>
              )}
            </div>
          )}
          <div>
            <p className="text-muted-foreground">{t("columnDate")}</p>
            <p className="text-foreground">
              {new Date(escalation.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 text-sm">
        <p className="text-muted-foreground">{t("form.reason")}</p>
        <p className="mt-1 whitespace-pre-wrap text-foreground">
          {escalation.reason}
        </p>
      </div>

      {escalation.resolution && (
        <div className="rounded-lg border border-border bg-card p-6 text-sm">
          <p className="text-muted-foreground">{t("form.resolution")}</p>
          <p className="mt-1 whitespace-pre-wrap text-foreground">
            {escalation.resolution}
          </p>
          {escalation.resolutionDate && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("form.resolutionDate")}:{" "}
              {new Date(escalation.resolutionDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      <AiEscalationResolutionForm escalation={escalation} onSubmit={submit} />
    </div>
  );
}

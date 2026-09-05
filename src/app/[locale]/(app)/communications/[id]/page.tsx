import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCommunicationById } from "@/lib/queries/communications";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CommunicationStatusBadge } from "@/components/communications/CommunicationStatusBadge";

export default async function CommunicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Communications");
  const tChannel = await getTranslations("ConversationChannel");
  const tDirection = await getTranslations("ConversationDirection");

  const result = await getCommunicationById(id);
  if (!result) notFound();

  const { communication, client, caseTitle, referralSeq, taskTitle } = result;
  const communicationNumber = `COM-${String(communication.communicationSeq).padStart(5, "0")}`;

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/communications"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToCommunications")}
        </Link>
        <Button render={<Link href={`/communications/${id}/edit`} />}>
          <Pencil className="h-4 w-4" />
          {t("editCommunication")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl text-foreground">
              {communicationNumber}
            </h1>
            <Badge variant="outline">{tChannel(communication.channel)}</Badge>
            <Badge variant="outline">
              {tDirection(communication.direction)}
            </Badge>
          </div>
          <CommunicationStatusBadge status={communication.status} />
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t("form.client")}</p>
            <Link
              href={`/clients/${client.id}`}
              className="text-foreground hover:underline"
            >
              {client.fullName}
            </Link>
          </div>
          {communication.businessName && (
            <div>
              <p className="text-muted-foreground">{t("form.businessName")}</p>
              <p className="text-foreground">{communication.businessName}</p>
            </div>
          )}
          {caseTitle && (
            <div>
              <p className="text-muted-foreground">{t("form.case")}</p>
              <p className="text-foreground">{caseTitle}</p>
            </div>
          )}
          {referralSeq && (
            <div>
              <p className="text-muted-foreground">{t("form.referral")}</p>
              <Link
                href={`/referrals/${communication.referralId}`}
                className="text-foreground hover:underline"
              >
                REF-{String(referralSeq).padStart(5, "0")}
              </Link>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">{t("columnDate")}</p>
            <p className="text-foreground">
              {new Date(communication.occurredAt).toLocaleString()}
            </p>
          </div>
          {communication.counterpart && (
            <div>
              <p className="text-muted-foreground">{t("form.counterpart")}</p>
              <p className="text-foreground">{communication.counterpart}</p>
            </div>
          )}
          {communication.durationMinutes != null && (
            <div>
              <p className="text-muted-foreground">
                {t("form.durationMinutes")}
              </p>
              <p className="text-foreground">
                {communication.durationMinutes}
              </p>
            </div>
          )}
        </div>
      </div>

      {communication.subject && (
        <div className="rounded-lg border border-border bg-card p-6 text-sm">
          <p className="text-muted-foreground">{t("form.subject")}</p>
          <p className="text-foreground">{communication.subject}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6 text-sm">
        <p className="text-muted-foreground">{t("form.summary")}</p>
        <p className="whitespace-pre-wrap text-foreground">
          {communication.summary}
        </p>
      </div>

      {communication.fullMessage && (
        <div className="rounded-lg border border-border bg-card p-6 text-sm">
          <p className="text-muted-foreground">{t("form.fullMessage")}</p>
          <p className="whitespace-pre-wrap text-foreground">
            {communication.fullMessage}
          </p>
        </div>
      )}

      <div className="grid gap-3 rounded-lg border border-border bg-card p-6 text-sm sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground">{t("form.followUpRequired")}</p>
          <p className="text-foreground">
            {communication.followUpRequired ? "✓" : "—"}
          </p>
        </div>
        {communication.followUpDate && (
          <div>
            <p className="text-muted-foreground">{t("form.followUpDate")}</p>
            <p className="text-foreground">
              {new Date(communication.followUpDate).toLocaleDateString()}
            </p>
          </div>
        )}
        {taskTitle && (
          <div>
            <p className="text-muted-foreground">{t("relatedTask")}</p>
            <Link
              href="/tasks"
              className="text-foreground hover:underline"
            >
              {taskTitle}
            </Link>
          </div>
        )}
        <div>
          <p className="text-muted-foreground">{t("assignedUser")}</p>
          <p className="text-foreground">—</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("createdBy")}</p>
          <p className="text-foreground">
            {communication.createdByEmail ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("createdDate")}</p>
          <p className="text-foreground">
            {new Date(communication.createdAt).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("updatedDate")}</p>
          <p className="text-foreground">
            {new Date(communication.updatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

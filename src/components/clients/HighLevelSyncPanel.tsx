"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  highlevelSyncFormSchema,
  integrationSyncStatusValues,
  highlevelSyncDirectionValues,
  type HighlevelSyncFormValues,
} from "@/lib/validation/highlevel";
import { upsertClientHighlevelSyncAction } from "@/app/[locale]/(app)/clients/highlevel-actions";
import type { ClientHighlevelSync } from "@/lib/db/schema";
import type { getHighLevelSyncPreview } from "@/lib/queries/highlevel";

export function HighLevelSyncPanel({
  clientId,
  sync,
  preview,
}: {
  clientId: string;
  sync: ClientHighlevelSync | null;
  preview: Awaited<ReturnType<typeof getHighLevelSyncPreview>>;
}) {
  const t = useTranslations("HighLevelSync");
  const tSyncStatus = useTranslations("IntegrationSyncStatus");
  const tSyncDirection = useTranslations("HighlevelSyncDirection");
  const tServiceType = useTranslations("ServiceType");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, control } = useForm<HighlevelSyncFormValues>({
    resolver: zodResolver(highlevelSyncFormSchema),
    defaultValues: {
      highlevelContactId: sync?.highlevelContactId ?? "",
      highlevelOpportunityId: sync?.highlevelOpportunityId ?? "",
      highlevelLocationId: sync?.highlevelLocationId ?? "",
      highlevelTag: sync?.highlevelTag ?? "",
      highlevelPipeline: sync?.highlevelPipeline ?? "",
      syncStatus: sync?.syncStatus ?? "not_connected",
      syncDirection: sync?.syncDirection ?? "",
    },
  });

  function submit(values: HighlevelSyncFormValues) {
    startTransition(async () => {
      await upsertClientHighlevelSyncAction(clientId, values);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <h3 className="font-heading text-base text-foreground">
          {t("title")}
        </h3>
        {sync && (
          <Badge variant="outline">{tSyncStatus(sync.syncStatus)}</Badge>
        )}
      </div>

      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="highlevelContactId">{t("contactId")}</Label>
            <Input id="highlevelContactId" {...register("highlevelContactId")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="highlevelOpportunityId">{t("opportunityId")}</Label>
            <Input
              id="highlevelOpportunityId"
              {...register("highlevelOpportunityId")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="highlevelLocationId">{t("locationId")}</Label>
            <Input id="highlevelLocationId" {...register("highlevelLocationId")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="highlevelTag">{t("tag")}</Label>
            <Input id="highlevelTag" {...register("highlevelTag")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="highlevelPipeline">{t("pipeline")}</Label>
            <Input id="highlevelPipeline" {...register("highlevelPipeline")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("syncStatus")}</Label>
            <Controller
              control={control}
              name="syncStatus"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {integrationSyncStatusValues.map((s) => (
                      <SelectItem key={s} value={s}>
                        {tSyncStatus(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("syncDirection")}</Label>
            <Controller
              control={control}
              name="syncDirection"
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("notSet")}</SelectItem>
                    {highlevelSyncDirectionValues.map((d) => (
                      <SelectItem key={d} value={d}>
                        {tSyncDirection(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("lastSyncDate")}</p>
            <p className="text-sm text-foreground">
              {sync?.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("lastSyncResult")}</p>
            <p className="text-sm text-foreground">{sync?.lastSyncResult ?? "—"}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-sm text-muted-foreground">{t("saved")}</span>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </form>

      {preview && (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-4">
          <h4 className="text-sm font-medium text-foreground">
            {t("previewTitle")}
          </h4>
          <p className="text-xs text-muted-foreground">{t("previewNote")}</p>
          <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            <dt className="text-muted-foreground">{t("previewClientName")}</dt>
            <dd className="text-foreground">{preview.clientName}</dd>
            <dt className="text-muted-foreground">{t("previewBusinessName")}</dt>
            <dd className="text-foreground">{preview.businessName ?? "—"}</dd>
            <dt className="text-muted-foreground">{t("previewPhone")}</dt>
            <dd className="text-foreground">{preview.phone ?? "—"}</dd>
            <dt className="text-muted-foreground">{t("previewEmail")}</dt>
            <dd className="text-foreground">{preview.email ?? "—"}</dd>
            <dt className="text-muted-foreground">{t("previewLanguage")}</dt>
            <dd className="text-foreground">
              {preview.language.toUpperCase()}
            </dd>
            <dt className="text-muted-foreground">{t("previewServiceInterest")}</dt>
            <dd className="text-foreground">
              {preview.serviceInterest.length
                ? preview.serviceInterest.map((s) => tServiceType(s)).join(", ")
                : "—"}
            </dd>
            <dt className="text-muted-foreground">{t("previewLeadSource")}</dt>
            <dd className="text-foreground">{preview.leadSource ?? "—"}</dd>
            <dt className="text-muted-foreground">{t("previewAssignedUser")}</dt>
            <dd className="text-foreground">{preview.assignedUser ?? "—"}</dd>
            <dt className="text-muted-foreground">{t("previewAppointmentDate")}</dt>
            <dd className="text-foreground">
              {preview.appointmentDate
                ? new Date(preview.appointmentDate).toLocaleDateString()
                : "—"}
            </dd>
            <dt className="text-muted-foreground">{t("previewClientStatus")}</dt>
            <dd className="text-foreground">{preview.clientStatus}</dd>
            <dt className="text-muted-foreground">{t("previewAcademyInterest")}</dt>
            <dd className="text-foreground">
              {preview.academyInterest ? "✓" : "—"}
            </dd>
            <dt className="text-muted-foreground">{t("previewConsent")}</dt>
            <dd className="text-foreground">
              {[
                preview.communicationConsent.email && "Email",
                preview.communicationConsent.sms && "SMS",
                preview.communicationConsent.whatsapp && "WhatsApp",
                preview.communicationConsent.marketing && "Marketing",
              ]
                .filter(Boolean)
                .join(", ") || "—"}
            </dd>
          </dl>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  aiEscalationResolutionFormSchema,
  aiEscalationStatusValues,
  type AiEscalationResolutionFormValues,
} from "@/lib/validation/aiEscalation";
import type { AiEscalation } from "@/lib/db/schema";
import { containsLikelySsnOrItin } from "@/lib/sensitiveDataCheck";

export function AiEscalationResolutionForm({
  escalation,
  onSubmit,
}: {
  escalation: AiEscalation;
  onSubmit: (values: AiEscalationResolutionFormValues) => Promise<void>;
}) {
  const t = useTranslations("AiEscalations.form");
  const tStatus = useTranslations("AiEscalationStatus");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<AiEscalationResolutionFormValues>({
    resolver: zodResolver(aiEscalationResolutionFormSchema),
    defaultValues: {
      status: escalation.status,
      assignedHumanEmail: escalation.assignedHumanEmail ?? "",
      resolution: escalation.resolution ?? "",
      resolutionDate: escalation.resolutionDate ?? "",
    },
  });

  const resolutionValue = watch("resolution");
  const showSensitiveDataWarning = containsLikelySsnOrItin(resolutionValue ?? "");

  async function submit(values: AiEscalationResolutionFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
    >
      <h2 className="font-heading text-lg text-foreground">
        {t("resolutionTitle")}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("status")}</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiEscalationStatusValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tStatus(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assignedHumanEmail">{t("assignedHuman")}</Label>
          <Input
            id="assignedHumanEmail"
            type="email"
            placeholder="staff@anthonyservice.com"
            {...register("assignedHumanEmail")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="resolutionDate">{t("resolutionDate")}</Label>
          <Input id="resolutionDate" type="date" {...register("resolutionDate")} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="resolution">{t("resolution")}</Label>
        <Textarea id="resolution" rows={3} {...register("resolution")} />
        {errors.resolution && (
          <p className="text-sm text-destructive">{errors.resolution.message}</p>
        )}
      </div>

      {showSensitiveDataWarning && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {t("sensitiveDataWarning")}
        </p>
      )}

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

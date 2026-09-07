"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
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
  aiEscalationFormSchema,
  aiEscalationRiskLevelValues,
  type AiEscalationFormValues,
} from "@/lib/validation/aiEscalation";

export function AiEscalationForm({
  agents,
  clients,
  cases,
  defaultAgentId,
  defaultClientId,
  defaultCaseId,
  onSubmit,
}: {
  agents: { id: string; name: string; title: string }[];
  clients: { id: string; fullName: string }[];
  cases: { id: string; title: string }[];
  defaultAgentId?: string;
  defaultClientId?: string;
  defaultCaseId?: string;
  onSubmit: (values: AiEscalationFormValues) => Promise<void>;
}) {
  const t = useTranslations("AiEscalations.form");
  const tRisk = useTranslations("AiEscalationRiskLevel");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AiEscalationFormValues>({
    resolver: zodResolver(aiEscalationFormSchema),
    defaultValues: {
      agentId: defaultAgentId ?? "",
      clientId: defaultClientId ?? "",
      caseId: defaultCaseId ?? "",
      reason: "",
      riskLevel: "medium",
    },
  });

  async function submit(values: AiEscalationFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "digest" in err &&
        typeof (err as { digest?: unknown }).digest === "string" &&
        (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("agent")}</Label>
          <Controller
            control={control}
            name="agentId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectAgent")} />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name} — {agent.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.agentId && (
            <p className="text-sm text-destructive">{errors.agentId.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("client")}</Label>
          <Controller
            control={control}
            name="clientId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectClient")} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.clientId && (
            <p className="text-sm text-destructive">{errors.clientId.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("case")}</Label>
          <Controller
            control={control}
            name="caseId"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noCase")}</SelectItem>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("riskLevel")}</Label>
          <Controller
            control={control}
            name="riskLevel"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiEscalationRiskLevelValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tRisk(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reason">{t("reason")}</Label>
        <Textarea id="reason" rows={4} {...register("reason")} />
        {errors.reason && (
          <p className="text-sm text-destructive">{errors.reason.message}</p>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

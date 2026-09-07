"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  aiAgentProfileFormSchema,
  aiAgentDepartmentValues,
  aiAgentLanguageValues,
  aiAgentAvatarStyleValues,
  type AiAgentProfileFormValues,
} from "@/lib/validation/aiAgent";
import type { AiAgent } from "@/lib/db/schema";

const PERMISSION_FIELDS = [
  "canRead",
  "canWrite",
  "canCreateTask",
  "canCreateNote",
  "canChangeStatus",
  "canSendDraft",
  "canSendMessage",
  "canEscalate",
] as const;

// Section 10's default-deny rule — there is no column for any of these on
// ai_agents, so this list is display-only by construction: nothing in this
// form can ever grant them.
const PERMANENT_RESTRICTIONS = [
  "deleteClientRecords",
  "deletePayments",
  "deleteReferrals",
  "modifyCommission",
  "changeOwnershipData",
  "changeAdminSettings",
  "viewSystemSecrets",
] as const;

export function AiAgentProfileForm({
  agent,
  onSubmit,
}: {
  agent: AiAgent;
  onSubmit: (values: AiAgentProfileFormValues) => Promise<void>;
}) {
  const t = useTranslations("AiTeam.form");
  const tDepartment = useTranslations("AiAgentDepartment");
  const tLanguage = useTranslations("AiAgentLanguage");
  const tAvatarStyle = useTranslations("AiAgentAvatarStyle");
  const tPermission = useTranslations("AiAgentPermission");
  const tRestriction = useTranslations("AiAgentPermanentRestriction");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AiAgentProfileFormValues>({
    resolver: zodResolver(aiAgentProfileFormSchema),
    defaultValues: {
      name: agent.name,
      title: agent.title,
      department: agent.department,
      language: agent.language,
      avatarStyle: agent.avatarStyle,
      accentColor: agent.accentColor ?? "",
      bio: agent.bio ?? "",
      welcomeMessage: agent.welcomeMessage ?? "",
      disclaimerText: agent.disclaimerText ?? "",
      canRead: agent.canRead,
      canWrite: agent.canWrite,
      canCreateTask: agent.canCreateTask,
      canCreateNote: agent.canCreateNote,
      canChangeStatus: agent.canChangeStatus,
      canSendDraft: agent.canSendDraft,
      canSendMessage: agent.canSendMessage,
      canEscalate: agent.canEscalate,
    },
  });

  async function submit(values: AiAgentProfileFormValues) {
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
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">{t("title")}</Label>
          <Input id="title" {...register("title")} />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("department")}</Label>
          <Controller
            control={control}
            name="department"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiAgentDepartmentValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tDepartment(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("language")}</Label>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiAgentLanguageValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tLanguage(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("avatarStyle")}</Label>
          <Controller
            control={control}
            name="avatarStyle"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiAgentAvatarStyleValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tAvatarStyle(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="accentColor">{t("accentColor")}</Label>
          <Controller
            control={control}
            name="accentColor"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Input
                  id="accentColor"
                  placeholder="#3A86FF"
                  value={field.value}
                  onChange={field.onChange}
                />
                <input
                  type="color"
                  aria-label={t("accentColor")}
                  className="h-9 w-10 shrink-0 rounded-md border border-input bg-transparent"
                  value={
                    /^#[0-9a-fA-F]{6}$/.test(field.value ?? "")
                      ? field.value!
                      : "#3A86FF"
                  }
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </div>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">{t("bio")}</Label>
        <Textarea id="bio" rows={3} {...register("bio")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="welcomeMessage">{t("welcomeMessage")}</Label>
        <Textarea id="welcomeMessage" rows={2} {...register("welcomeMessage")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="disclaimerText">{t("disclaimerText")}</Label>
        <Textarea id="disclaimerText" rows={2} {...register("disclaimerText")} />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-base text-foreground">
          {t("permissionsTitle")}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {PERMISSION_FIELDS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <Controller
                control={control}
                name={key}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{tPermission(key)}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <h3 className="flex items-center gap-2 font-heading text-base text-foreground">
          <Lock className="h-4 w-4" />
          {t("permanentRestrictionsTitle")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("permanentRestrictionsHint")}
        </p>
        <ul className="grid list-disc gap-1 pl-5 text-sm text-muted-foreground sm:grid-cols-2">
          {PERMANENT_RESTRICTIONS.map((key) => (
            <li key={key}>{tRestriction(key)}</li>
          ))}
        </ul>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

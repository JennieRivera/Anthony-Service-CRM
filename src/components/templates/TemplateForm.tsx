"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
  messageTemplateFormSchema,
  messageTemplateCategoryValues,
  type MessageTemplateFormValues,
} from "@/lib/validation/messageTemplate";
import { communicationChannelValues } from "@/lib/validation/communication";
import type { MessageTemplate } from "@/lib/db/schema";

export function TemplateForm({
  template,
  onSubmit,
}: {
  template?: MessageTemplate;
  onSubmit: (values: MessageTemplateFormValues) => Promise<void>;
}) {
  const t = useTranslations("Templates.form");
  const tChannel = useTranslations("ConversationChannel");
  const tCategory = useTranslations("MessageTemplateCategory");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<MessageTemplateFormValues>({
    resolver: zodResolver(messageTemplateFormSchema),
    defaultValues: {
      name: template?.name ?? "",
      language: template?.language ?? "en",
      channel: template?.channel ?? "email",
      category: template?.category ?? "welcome",
      subject: template?.subject ?? "",
      messageBody: template?.messageBody ?? "",
      active: template?.active ?? true,
    },
  });

  const channel = watch("channel");

  async function submit(values: MessageTemplateFormValues) {
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
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
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("channel")}</Label>
          <Controller
            control={control}
            name="channel"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {communicationChannelValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tChannel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>{t("category")}</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {messageTemplateCategoryValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tCategory(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {channel === "email" && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="subject">{t("subject")}</Label>
            <Input id="subject" {...register("subject")} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="messageBody">{t("messageBody")}</Label>
        <Textarea id="messageBody" rows={6} {...register("messageBody")} />
        {errors.messageBody && (
          <p className="text-sm text-destructive">
            {errors.messageBody.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        <Label>{t("active")}</Label>
      </div>

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

"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  conversationMessageFormSchema,
  conversationDirectionValues,
  loggableConversationChannelValues,
  type ConversationMessageFormValues,
} from "@/lib/validation/conversation";
import { createConversationMessageAction } from "@/app/[locale]/(app)/clients/conversation-actions";

function nowForInput() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function LogConversationDialog({ clientId }: { clientId: string }) {
  const t = useTranslations("Conversations.form");
  const tChannel = useTranslations("ConversationChannel");
  const tDirection = useTranslations("ConversationDirection");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<ConversationMessageFormValues>({
    resolver: zodResolver(conversationMessageFormSchema),
    defaultValues: {
      clientId,
      channel: "call",
      direction: "outbound",
      occurredAt: nowForInput(),
      subject: "",
      summary: "",
      durationMinutes: "",
      counterpart: "",
    },
  });

  const channel = watch("channel");

  function submit(values: ConversationMessageFormValues) {
    startTransition(async () => {
      await createConversationMessageAction(values);
      reset({
        clientId,
        channel: "call",
        direction: "outbound",
        occurredAt: nowForInput(),
        subject: "",
        summary: "",
        durationMinutes: "",
        counterpart: "",
      });
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4" />
        {t("logEntry")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("logEntry")}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(submit)}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
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
                      {loggableConversationChannelValues.map((value) => (
                        <SelectItem key={value} value={value}>
                          {tChannel(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("direction")}</Label>
              <Controller
                control={control}
                name="direction"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conversationDirectionValues.map((value) => (
                        <SelectItem key={value} value={value}>
                          {tDirection(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="occurredAt">{t("occurredAt")}</Label>
              <Input
                id="occurredAt"
                type="datetime-local"
                {...register("occurredAt")}
              />
              {errors.occurredAt && (
                <p className="text-sm text-destructive">
                  {errors.occurredAt.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="counterpart">{t("counterpart")}</Label>
              <Input id="counterpart" {...register("counterpart")} />
            </div>

            {channel === "email" && (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="subject">{t("subject")}</Label>
                <Input
                  id="subject"
                  placeholder={t("subjectPlaceholder")}
                  {...register("subject")}
                />
              </div>
            )}

            {channel === "call" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="durationMinutes">
                  {t("durationMinutes")}
                </Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min="0"
                  {...register("durationMinutes")}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="summary">{t("summary")}</Label>
            <Textarea
              id="summary"
              rows={3}
              placeholder={t("summaryPlaceholder")}
              {...register("summary")}
            />
            {errors.summary && (
              <p className="text-sm text-destructive">
                {errors.summary.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
  websiteChatSessionFormSchema,
  websiteSourceValues,
  type WebsiteChatSessionFormValues,
} from "@/lib/validation/socialChannels";
import { createWebsiteChatSessionAction } from "@/app/[locale]/(app)/communications/social-actions";
import { serviceTypeValues } from "@/lib/validation/client";

export function AddWebsiteChatDialog({
  clients,
}: {
  clients: { id: string; fullName: string }[];
}) {
  const t = useTranslations("SocialChannels.websiteChat");
  const tSource = useTranslations("WebsiteSource");
  const tService = useTranslations("ServiceType");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, control, reset, formState: { errors } } =
    useForm<WebsiteChatSessionFormValues>({
      resolver: zodResolver(websiteChatSessionFormSchema),
      defaultValues: {
        clientId: "",
        websiteSource: "anthonyservice_com",
        visitorName: "",
        visitorEmail: "",
        visitorPhone: "",
        language: "",
        serviceInterest: "",
        message: "",
        conversationStatus: "new",
        followUpDate: "",
      },
    });

  function submit(values: WebsiteChatSessionFormValues) {
    startTransition(async () => {
      await createWebsiteChatSessionAction(values);
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4" />
        {t("add")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("source")}</Label>
              <Controller
                control={control}
                name="websiteSource"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {websiteSourceValues.map((s) => (
                        <SelectItem key={s} value={s}>
                          {tSource(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("client")}</Label>
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("noClient")}</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitorName">{t("visitorName")}</Label>
              <Input id="visitorName" {...register("visitorName")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitorEmail">{t("visitorEmail")}</Label>
              <Input id="visitorEmail" type="email" {...register("visitorEmail")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitorPhone">{t("visitorPhone")}</Label>
              <Input id="visitorPhone" {...register("visitorPhone")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("language")}</Label>
              <Controller
                control={control}
                name="language"
                render={({ field }) => (
                  <Select
                    value={field.value || "unknown"}
                    onValueChange={(v) =>
                      field.onChange(v === "unknown" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">{t("unknown")}</SelectItem>
                      <SelectItem value="en">EN</SelectItem>
                      <SelectItem value="es">ES</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("serviceInterest")}</Label>
              <Controller
                control={control}
                name="serviceInterest"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("noServiceInterest")}</SelectItem>
                      {serviceTypeValues.map((s) => (
                        <SelectItem key={s} value={s}>
                          {tService(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="followUpDate">{t("followUpDate")}</Label>
              <Input id="followUpDate" type="date" {...register("followUpDate")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="message">{t("message")}</Label>
            <Textarea id="message" rows={3} {...register("message")} />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
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

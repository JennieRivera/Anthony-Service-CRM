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
  appointmentFormSchema,
  appointmentStatusValues,
  appointmentTypeValues,
  type AppointmentFormValues,
} from "@/lib/validation/appointment";
import { serviceTypeValues } from "@/lib/validation/client";
import { paymentStatusValues } from "@/lib/validation/payment";
import { ClientMatchPicker } from "./ClientMatchPicker";
import type { Appointment } from "@/lib/db/schema";

function toLocalInput(value: Date | string | undefined) {
  if (!value) return "";
  const d = new Date(value);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function AppointmentForm({
  appointment,
  clients,
  cases,
  defaultClientId,
  defaultStart,
  onSubmit,
}: {
  appointment?: Appointment;
  clients: { id: string; fullName: string }[];
  cases: { id: string; title: string; clientId: string }[];
  defaultClientId?: string;
  defaultStart?: string;
  onSubmit: (values: AppointmentFormValues) => Promise<void>;
}) {
  const t = useTranslations("Appointments.form");
  const tStatus = useTranslations("AppointmentStatus");
  const tService = useTranslations("ServiceType");
  const tType = useTranslations("AppointmentType");
  const tPaymentStatus = useTranslations("PaymentStatus");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const defaultStartValue = defaultStart
    ? defaultStart
    : toLocalInput(appointment?.startAt);
  const defaultEndValue = appointment?.endAt
    ? toLocalInput(appointment.endAt)
    : defaultStart
      ? toLocalInput(new Date(new Date(defaultStart).getTime() + 30 * 60000))
      : "";

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      clientId: appointment?.clientId ?? defaultClientId ?? "",
      newClientFullName: "",
      newClientPhone: "",
      newClientEmail: "",
      newClientBusinessName: "",
      caseId: appointment?.caseId ?? "",
      title: appointment?.title ?? "",
      serviceType: appointment?.serviceType ?? "online_notary",
      appointmentType: appointment?.appointmentType ?? "in_person",
      startAt: defaultStartValue,
      endAt: defaultEndValue,
      location: appointment?.location ?? "",
      status: appointment?.status ?? "scheduled",
      referralSource: appointment?.referralSource ?? "",
      documentsNeeded: appointment?.documentsNeeded ?? "",
      paymentRequired: appointment?.paymentRequired ?? false,
      paymentStatus: appointment?.paymentStatus ?? "",
      notes: appointment?.notes ?? "",
    },
  });

  const selectedClientId = watch("clientId");
  const paymentRequired = watch("paymentRequired");
  const clientCases = cases.filter((c) => c.clientId === selectedClientId);

  async function submit(values: AppointmentFormValues) {
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">{t("title")}</Label>
        <Input id="title" {...register("title")} />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("client")}</Label>
        <ClientMatchPicker
          control={control}
          register={register}
          setValue={setValue}
          watch={watch}
          clients={clients}
        />
        {errors.clientId && (
          <p className="text-sm text-destructive">{errors.clientId.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("case")}</Label>
          <Controller
            control={control}
            name="caseId"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                disabled={!selectedClientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("noCase")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noCase")}</SelectItem>
                  {clientCases.map((c) => (
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
          <Label>{t("serviceType")}</Label>
          <Controller
            control={control}
            name="serviceType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypeValues.map((service) => (
                    <SelectItem key={service} value={service}>
                      {tService(service)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("appointmentType")}</Label>
          <Controller
            control={control}
            name="appointmentType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {appointmentTypeValues.map((type) => (
                    <SelectItem key={type} value={type}>
                      {tType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startAt">{t("startAt")}</Label>
          <Input id="startAt" type="datetime-local" {...register("startAt")} />
          {errors.startAt && (
            <p className="text-sm text-destructive">
              {errors.startAt.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endAt">{t("endAt")}</Label>
          <Input id="endAt" type="datetime-local" {...register("endAt")} />
          {errors.endAt && (
            <p className="text-sm text-destructive">{errors.endAt.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="location">{t("location")}</Label>
          <Input id="location" placeholder={t("locationPlaceholder")} {...register("location")} />
        </div>

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
                  {appointmentStatusValues.map((status) => (
                    <SelectItem key={status} value={status}>
                      {tStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="referralSource">{t("referralSource")}</Label>
          <Input id="referralSource" {...register("referralSource")} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="documentsNeeded">{t("documentsNeeded")}</Label>
        <Textarea id="documentsNeeded" rows={2} {...register("documentsNeeded")} />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="paymentRequired"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label>{t("paymentRequired")}</Label>
        </div>
        {paymentRequired && (
          <div className="flex flex-col gap-1.5 sm:w-64">
            <Label>{t("paymentStatus")}</Label>
            <Controller
              control={control}
              name="paymentStatus"
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("paymentStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatusValues.map((status) => (
                      <SelectItem key={status} value={status}>
                        {tPaymentStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
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

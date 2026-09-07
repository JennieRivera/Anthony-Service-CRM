"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  ExternalLink,
  MessageSquare,
  CalendarClock,
  Ban,
  CheckCircle2,
  ListPlus,
  CreditCard,
  StickyNote,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
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
import { paymentStatusValues } from "@/lib/validation/payment";
import {
  updateAppointmentStatusAction,
  updateAppointmentPaymentStatusAction,
  addAppointmentNoteAction,
  createFollowUpTaskAction,
  rescheduleAppointmentAction,
} from "@/app/[locale]/(app)/appointments/actions";
import type { Appointment } from "@/lib/db/schema";

function toLocalInput(value: Date | string) {
  const d = new Date(value);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function AppointmentDetailActions({
  appointment,
  clientId,
  companyId,
  caseId,
}: {
  appointment: Appointment;
  clientId: string;
  companyId: string | null;
  caseId: string | null;
}) {
  const t = useTranslations("Appointments.detail");
  const tPaymentStatus = useTranslations("PaymentStatus");
  const [isPending, startTransition] = useTransition();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(
    appointment.paymentStatus ?? "unpaid",
  );

  const { register, handleSubmit } = useForm({
    defaultValues: {
      startAt: toLocalInput(appointment.startAt),
      endAt: toLocalInput(appointment.endAt),
    },
  });

  function submitReschedule(values: { startAt: string; endAt: string }) {
    startTransition(async () => {
      await rescheduleAppointmentAction(appointment.id, values);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" render={<Link href={`/clients/${clientId}`} />}>
        <ExternalLink className="h-4 w-4" />
        {t("openClient360")}
      </Button>

      {companyId && (
        <Button size="sm" variant="outline" render={<Link href={`/companies/${companyId}`} />}>
          <ExternalLink className="h-4 w-4" />
          {t("openCompany360")}
        </Button>
      )}

      {caseId && (
        <Button size="sm" variant="outline" render={<Link href={`/cases/${caseId}`} />}>
          <ExternalLink className="h-4 w-4" />
          {t("openService")}
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        render={<Link href={`/communications/new?clientId=${clientId}${caseId ? `&caseId=${caseId}` : ""}`} />}
      >
        <MessageSquare className="h-4 w-4" />
        {t("sendMessage")}
      </Button>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogTrigger render={<Button size="sm" variant="outline" />}>
          <CalendarClock className="h-4 w-4" />
          {t("reschedule")}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reschedule")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(submitReschedule)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reschedule-start">{t("newStart")}</Label>
                <Input id="reschedule-start" type="datetime-local" {...register("startAt")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reschedule-end">{t("newEnd")}</Label>
                <Input id="reschedule-end" type="datetime-local" {...register("endAt")} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("rescheduleHint")}</p>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("saving") : t("confirmReschedule")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(() => updateAppointmentStatusAction(appointment.id, "cancelled"))
        }
      >
        <Ban className="h-4 w-4" />
        {t("cancel")}
      </Button>

      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(() => updateAppointmentStatusAction(appointment.id, "completed"))
        }
      >
        <CheckCircle2 className="h-4 w-4" />
        {t("markCompleted")}
      </Button>

      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(() => createFollowUpTaskAction(appointment.id))}
      >
        <ListPlus className="h-4 w-4" />
        {t("createFollowUp")}
      </Button>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogTrigger render={<Button size="sm" variant="outline" />}>
          <CreditCard className="h-4 w-4" />
          {t("recordPayment")}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("recordPayment")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("paymentStatus")}</Label>
              <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as typeof paymentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentStatusValues.map((status) => (
                    <SelectItem key={status} value={status}>
                      {tPaymentStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await updateAppointmentPaymentStatusAction(appointment.id, paymentStatus);
                    setPaymentOpen(false);
                  })
                }
              >
                {isPending ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogTrigger render={<Button size="sm" variant="outline" />}>
          <StickyNote className="h-4 w-4" />
          {t("addNote")}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addNote")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t("addNotePlaceholder")}
            />
            <DialogFooter>
              <Button
                type="button"
                disabled={isPending || !noteText.trim()}
                onClick={() =>
                  startTransition(async () => {
                    await addAppointmentNoteAction(appointment.id, noteText);
                    setNoteText("");
                    setNoteOpen(false);
                  })
                }
              >
                {isPending ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

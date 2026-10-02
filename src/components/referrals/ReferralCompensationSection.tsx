"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Pencil, Check, ThumbsUp, DollarSign, Undo2 } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  compensationTermsFormSchema,
  compensationTypeValues,
  compensationEarningTriggerValues,
  compensationPartialPaymentRuleValues,
  markCompensationEarnedFormSchema,
  approveCompensationFormSchema,
  recordCompensationPaymentFormSchema,
  reverseCompensationPaymentFormSchema,
  type CompensationTermsFormValues,
  type MarkCompensationEarnedFormValues,
  type ApproveCompensationFormValues,
  type RecordCompensationPaymentFormValues,
  type ReverseCompensationPaymentFormValues,
} from "@/lib/validation/referralCompensation";
import type { ReferralCompensation, ReferralCompensationPayment } from "@/lib/db/schema";

const statusVariant: Record<string, "secondary" | "default" | "outline"> = {
  not_earned: "outline",
  earned: "secondary",
  approved: "secondary",
  paid: "default",
};

export function ReferralCompensationSection({
  referralId,
  compensation,
  payments,
  canEditTerms,
  canApprove,
  canRecordPayment,
  onSetTerms,
  onMarkEarned,
  onApprove,
  onRecordPayment,
  onReversePayment,
}: {
  referralId: string;
  compensation: ReferralCompensation | null;
  payments: ReferralCompensationPayment[];
  // RBAC correction — three independently least-privileged permissions in
  // place of one "canManageCompensation" boolean: Referral Manager gets
  // canEditTerms only (terms + marking Earned), Bookkeeping Staff gets
  // canRecordPayment only (record + reverse payment), and canApprove is
  // true for no narrow role today (super_admin/admin/manager only).
  canEditTerms: boolean;
  canApprove: boolean;
  canRecordPayment: boolean;
  onSetTerms: (referralId: string, values: CompensationTermsFormValues) => Promise<unknown>;
  onMarkEarned: (referralId: string, compensationId: string, values: MarkCompensationEarnedFormValues) => Promise<void>;
  onApprove: (referralId: string, compensationId: string, values: ApproveCompensationFormValues) => Promise<void>;
  onRecordPayment: (referralId: string, compensationId: string, values: RecordCompensationPaymentFormValues) => Promise<void>;
  onReversePayment: (referralId: string, paymentId: string, values: ReverseCompensationPaymentFormValues) => Promise<void>;
}) {
  const t = useTranslations("Referrals.compensation");
  const tType = useTranslations("CompensationType");
  const tTrigger = useTranslations("CompensationEarningTrigger");
  const tPartial = useTranslations("CompensationPartialPaymentRule");
  const tStatus = useTranslations("CompensationStatus");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [termsOpen, setTermsOpen] = useState(false);
  const [earnedOpen, setEarnedOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null);

  const termsForm = useForm<CompensationTermsFormValues>({
    resolver: zodResolver(compensationTermsFormSchema),
    defaultValues: {
      compensationType: compensation?.compensationType ?? "none",
      percentageRate: compensation?.percentageRate ?? "",
      fixedAmount: compensation?.fixedAmount ?? "",
      eligibleBaseAmount: compensation?.eligibleBaseAmount ?? "",
      baseDescription: compensation?.baseDescription ?? "",
      earningTrigger: compensation?.earningTrigger ?? "",
      earningTriggerNotes: compensation?.earningTriggerNotes ?? "",
      partialPaymentRule: compensation?.partialPaymentRule ?? "",
      agreementDocumentId: compensation?.agreementDocumentId ?? "",
      notes: compensation?.notes ?? "",
    },
  });
  const watchedType = termsForm.watch("compensationType");

  const earnedForm = useForm<MarkCompensationEarnedFormValues>({
    resolver: zodResolver(markCompensationEarnedFormSchema),
    defaultValues: { earnedNotes: "" },
  });

  const approveForm = useForm<ApproveCompensationFormValues>({
    resolver: zodResolver(approveCompensationFormSchema),
    defaultValues: { approvedAmount: "", approvalNotes: "" },
  });

  const paymentForm = useForm<RecordCompensationPaymentFormValues>({
    resolver: zodResolver(recordCompensationPaymentFormSchema),
    defaultValues: { amountPaid: "", paymentDate: "", paymentMethod: "", paymentReference: "", notes: "" },
  });

  const reverseForm = useForm<ReverseCompensationPaymentFormValues>({
    resolver: zodResolver(reverseCompensationPaymentFormSchema),
    defaultValues: { reversalReason: "" },
  });

  function submitTerms(values: CompensationTermsFormValues) {
    setError(null);
    startTransition(async () => {
      try {
        await onSetTerms(referralId, values);
        setTermsOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function submitEarned(values: MarkCompensationEarnedFormValues) {
    if (!compensation) return;
    setError(null);
    startTransition(async () => {
      try {
        await onMarkEarned(referralId, compensation.id, values);
        setEarnedOpen(false);
        earnedForm.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function submitApprove(values: ApproveCompensationFormValues) {
    if (!compensation) return;
    setError(null);
    startTransition(async () => {
      try {
        await onApprove(referralId, compensation.id, values);
        setApproveOpen(false);
        approveForm.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function submitPayment(values: RecordCompensationPaymentFormValues) {
    if (!compensation) return;
    setError(null);
    startTransition(async () => {
      try {
        await onRecordPayment(referralId, compensation.id, values);
        setPaymentOpen(false);
        paymentForm.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function submitReverse(values: ReverseCompensationPaymentFormValues) {
    if (!reversingPaymentId) return;
    setError(null);
    startTransition(async () => {
      try {
        await onReversePayment(referralId, reversingPaymentId, values);
        setReversingPaymentId(null);
        reverseForm.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const totalPaid = payments
    .filter((p) => !p.reversed)
    .reduce((sum, p) => sum + Number(p.amountPaid), 0);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
        <div className="flex items-center gap-2">
          {compensation && <Badge variant={statusVariant[compensation.status]}>{tStatus(compensation.status)}</Badge>}
          {canEditTerms && (
          <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>
              <Pencil className="h-4 w-4" />
              {compensation ? t("editTerms") : t("setTerms")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("setTerms")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={termsForm.handleSubmit(submitTerms)} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>{t("compensationType")}</Label>
                  <Controller
                    control={termsForm.control}
                    name="compensationType"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          if (v !== "percentage") termsForm.setValue("percentageRate", "");
                          if (v !== "fixed") termsForm.setValue("fixedAmount", "");
                          if (v !== "percentage" && v !== "custom") {
                            termsForm.setValue("eligibleBaseAmount", "");
                            termsForm.setValue("baseDescription", "");
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {compensationTypeValues.map((v) => (
                            <SelectItem key={v} value={v}>
                              {tType(v)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {watchedType === "percentage" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="percentageRate">{t("percentageRate")}</Label>
                    <Input id="percentageRate" type="number" step="0.01" {...termsForm.register("percentageRate")} />
                    {termsForm.formState.errors.percentageRate && (
                      <p className="text-sm text-destructive">{termsForm.formState.errors.percentageRate.message}</p>
                    )}
                  </div>
                )}

                {watchedType === "fixed" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fixedAmount">{t("fixedAmount")}</Label>
                    <Input id="fixedAmount" type="number" step="0.01" {...termsForm.register("fixedAmount")} />
                    {termsForm.formState.errors.fixedAmount && (
                      <p className="text-sm text-destructive">{termsForm.formState.errors.fixedAmount.message}</p>
                    )}
                  </div>
                )}

                {(watchedType === "percentage" || watchedType === "custom") && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="eligibleBaseAmount">{t("eligibleBaseAmount")}</Label>
                      <Input id="eligibleBaseAmount" type="number" step="0.01" {...termsForm.register("eligibleBaseAmount")} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="baseDescription">{t("baseDescription")}</Label>
                      <Input id="baseDescription" {...termsForm.register("baseDescription")} />
                    </div>
                  </div>
                )}

                {watchedType !== "none" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label>{t("earningTrigger")}</Label>
                      <Controller
                        control={termsForm.control}
                        name="earningTrigger"
                        render={({ field }) => (
                          <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("selectTrigger")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t("selectTrigger")}</SelectItem>
                              {compensationEarningTriggerValues.map((v) => (
                                <SelectItem key={v} value={v}>
                                  {tTrigger(v)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>{t("partialPaymentRule")}</Label>
                      <Controller
                        control={termsForm.control}
                        name="partialPaymentRule"
                        render={({ field }) => (
                          <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("selectPartialRule")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t("selectPartialRule")}</SelectItem>
                              {compensationPartialPaymentRuleValues.map((v) => (
                                <SelectItem key={v} value={v}>
                                  {tPartial(v)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="termsNotes">{t("notes")}</Label>
                  <Textarea id="termsNotes" rows={2} {...termsForm.register("notes")} />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? t("saving") : t("save")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {!compensation ? (
        <p className="text-sm text-muted-foreground">{t("noCompensation")}</p>
      ) : (
        <>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">{t("compensationType")}</p>
              <p className="text-foreground">{tType(compensation.compensationType)}</p>
            </div>
            {compensation.percentageRate && (
              <div>
                <p className="text-muted-foreground">{t("percentageRate")}</p>
                <p className="text-foreground">{Number(compensation.percentageRate).toFixed(2)}%</p>
              </div>
            )}
            {compensation.fixedAmount && (
              <div>
                <p className="text-muted-foreground">{t("fixedAmount")}</p>
                <p className="text-foreground">${Number(compensation.fixedAmount).toFixed(2)}</p>
              </div>
            )}
            {compensation.eligibleBaseAmount && (
              <div>
                <p className="text-muted-foreground">{t("eligibleBaseAmount")}</p>
                <p className="text-foreground">${Number(compensation.eligibleBaseAmount).toFixed(2)}</p>
              </div>
            )}
            {compensation.baseDescription && (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">{t("baseDescription")}</p>
                <p className="text-foreground">{compensation.baseDescription}</p>
              </div>
            )}
            {compensation.earningTrigger && (
              <div>
                <p className="text-muted-foreground">{t("earningTrigger")}</p>
                <p className="text-foreground">{tTrigger(compensation.earningTrigger)}</p>
              </div>
            )}
            {compensation.partialPaymentRule && (
              <div>
                <p className="text-muted-foreground">{t("partialPaymentRule")}</p>
                <p className="text-foreground">{tPartial(compensation.partialPaymentRule)}</p>
              </div>
            )}
          </div>

          {compensation.status !== "not_earned" && (
            <div className="grid gap-3 border-t border-border pt-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">{t("earnedAt")}</p>
                <p className="text-foreground">{compensation.earnedAt ? formatDateTime(compensation.earnedAt) : "—"}</p>
              </div>
              {compensation.approvedAmount && (
                <div>
                  <p className="text-muted-foreground">{t("approvedAmount")}</p>
                  <p className="text-lg font-medium text-foreground">${Number(compensation.approvedAmount).toFixed(2)}</p>
                </div>
              )}
              {compensation.status === "approved" || compensation.status === "paid" ? (
                <div>
                  <p className="text-muted-foreground">{t("totalPaid")}</p>
                  <p className="text-foreground">${totalPaid.toFixed(2)}</p>
                </div>
              ) : null}
            </div>
          )}

          {(canEditTerms || canApprove || canRecordPayment) && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {canEditTerms && compensation.status === "not_earned" && compensation.compensationType !== "none" && (
                <Dialog open={earnedOpen} onOpenChange={setEarnedOpen}>
                  <DialogTrigger render={<Button size="sm" />}>
                    <Check className="h-4 w-4" />
                    {t("markEarned")}
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("markEarned")}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={earnedForm.handleSubmit(submitEarned)} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="earnedNotes">{t("notes")}</Label>
                        <Textarea id="earnedNotes" rows={2} {...earnedForm.register("earnedNotes")} />
                      </div>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                          {isPending ? t("saving") : t("confirm")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}

              {canApprove && compensation.status === "earned" && (
                <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                  <DialogTrigger render={<Button size="sm" />}>
                    <ThumbsUp className="h-4 w-4" />
                    {t("approve")}
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("approve")}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={approveForm.handleSubmit(submitApprove)} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="approvedAmount">{t("approvedAmount")}</Label>
                        <Input id="approvedAmount" type="number" step="0.01" {...approveForm.register("approvedAmount")} />
                        {approveForm.formState.errors.approvedAmount && (
                          <p className="text-sm text-destructive">{approveForm.formState.errors.approvedAmount.message}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="approvalNotes">{t("notes")}</Label>
                        <Textarea id="approvalNotes" rows={2} {...approveForm.register("approvalNotes")} />
                      </div>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                          {isPending ? t("saving") : t("confirm")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}

              {canRecordPayment && (compensation.status === "approved" || compensation.status === "paid") && (
                <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                  <DialogTrigger render={<Button size="sm" />}>
                    <DollarSign className="h-4 w-4" />
                    {t("recordPayment")}
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("recordPayment")}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={paymentForm.handleSubmit(submitPayment)} className="flex flex-col gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="amountPaid">{t("amountPaid")}</Label>
                          <Input id="amountPaid" type="number" step="0.01" {...paymentForm.register("amountPaid")} />
                          {paymentForm.formState.errors.amountPaid && (
                            <p className="text-sm text-destructive">{paymentForm.formState.errors.amountPaid.message}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="paymentDate">{t("paymentDate")}</Label>
                          <Input id="paymentDate" type="date" {...paymentForm.register("paymentDate")} />
                          {paymentForm.formState.errors.paymentDate && (
                            <p className="text-sm text-destructive">{paymentForm.formState.errors.paymentDate.message}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="paymentMethod">{t("paymentMethod")}</Label>
                          <Input id="paymentMethod" {...paymentForm.register("paymentMethod")} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="paymentReference">{t("paymentReference")}</Label>
                          <Input id="paymentReference" {...paymentForm.register("paymentReference")} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="paymentNotes">{t("notes")}</Label>
                        <Textarea id="paymentNotes" rows={2} {...paymentForm.register("notes")} />
                      </div>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                          {isPending ? t("saving") : t("confirm")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}

          {payments.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <h3 className="text-sm font-medium text-muted-foreground">{t("paymentHistory")}</h3>
              <ul className="flex flex-col divide-y divide-border">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className={p.reversed ? "text-muted-foreground line-through" : "text-foreground"}>
                        ${Number(p.amountPaid).toFixed(2)} · {formatDate(p.paymentDate)}
                        {p.paymentMethod ? ` · ${p.paymentMethod}` : ""}
                      </span>
                      {p.reversed && (
                        <span className="text-xs text-destructive">
                          {t("reversed")}: {p.reversalReason}
                        </span>
                      )}
                    </div>
                    {canRecordPayment && !p.reversed && (
                      <Dialog
                        open={reversingPaymentId === p.id}
                        onOpenChange={(open) => setReversingPaymentId(open ? p.id : null)}
                      >
                        <DialogTrigger render={<Button size="sm" variant="outline" />}>
                          <Undo2 className="h-3.5 w-3.5" />
                          {t("reverse")}
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("reverse")}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={reverseForm.handleSubmit(submitReverse)} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="reversalReason">{t("reversalReason")}</Label>
                              <Textarea id="reversalReason" rows={2} {...reverseForm.register("reversalReason")} />
                              {reverseForm.formState.errors.reversalReason && (
                                <p className="text-sm text-destructive">
                                  {reverseForm.formState.errors.reversalReason.message}
                                </p>
                              )}
                            </div>
                            {error && <p className="text-sm text-destructive">{error}</p>}
                            <DialogFooter>
                              <Button type="submit" variant="destructive" disabled={isPending}>
                                {isPending ? t("saving") : t("confirm")}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

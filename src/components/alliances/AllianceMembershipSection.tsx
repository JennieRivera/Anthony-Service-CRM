"use client";

import { FieldErrorText } from "@/components/ui/field-error-text";
import { useState, useTransition, useEffect } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Pencil, Check, PlayCircle, PauseCircle, XCircle, Link2, Plus, Trash2 } from "lucide-react";
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
  assignMembershipFormSchema,
  updateMembershipTermsFormSchema,
  changeMembershipStatusFormSchema,
  linkInvoiceFormSchema,
  benefitOverrideFormSchema,
  allianceMembershipStatusValues,
  membershipFeeTypeValues,
  membershipBenefitOverrideTypeValues,
  type AssignMembershipFormValues,
  type UpdateMembershipTermsFormValues,
  type ChangeMembershipStatusFormValues,
  type LinkInvoiceFormValues,
  type BenefitOverrideFormValues,
} from "@/lib/validation/membership";
import type { AllianceMembership } from "@/lib/db/schema";

type PlanOption = { id: string; name: string; billingModel: string; price: string | null; billingFrequency: string | null; currency: string };
type BenefitOption = { id: string; name: string; category: string | null };
type InvoiceOption = { id: string; invoiceSeq: number; status: string; total: string };
type MembershipData = {
  current: AllianceMembership | null;
  history: AllianceMembership[];
  statusHistory: { id: string; previousStatus: string | null; newStatus: string; changedAt: Date; changedByEmail: string | null; note: string | null }[];
  overrides: { id: string; overrideType: string; note: string | null; benefitId: string; benefitName: string }[];
  effectiveBenefits: { id: string; name: string; category: string | null }[];
  invoice: InvoiceOption | null;
};

const statusVariant: Record<string, "secondary" | "default" | "outline"> = {
  pending: "outline",
  active: "default",
  paused: "secondary",
  expired: "outline",
  cancelled: "outline",
};

export function AllianceMembershipSection({
  allianceId,
  membership,
  plans,
  benefits,
  linkableInvoices,
  canManage,
  canLinkInvoice,
  onAssign,
  onUpdateTerms,
  onChangeStatus,
  onLinkInvoice,
  onAddOverride,
  onRemoveOverride,
}: {
  allianceId: string;
  membership: MembershipData;
  plans: PlanOption[];
  benefits: BenefitOption[];
  linkableInvoices: InvoiceOption[];
  canManage: boolean;
  canLinkInvoice: boolean;
  onAssign: (allianceId: string, values: AssignMembershipFormValues) => Promise<void>;
  onUpdateTerms: (allianceId: string, values: UpdateMembershipTermsFormValues) => Promise<void>;
  onChangeStatus: (allianceId: string, values: ChangeMembershipStatusFormValues) => Promise<void>;
  onLinkInvoice: (allianceId: string, values: LinkInvoiceFormValues) => Promise<void>;
  onAddOverride: (allianceId: string, values: BenefitOverrideFormValues) => Promise<void>;
  onRemoveOverride: (allianceId: string, overrideId: string) => Promise<void>;
}) {
  const t = useTranslations("Membership");
  const tStatus = useTranslations("AllianceMembershipStatus");
  const tFeeType = useTranslations("MembershipFeeType");
  const tOverrideType = useTranslations("MembershipBenefitOverrideType");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const { current } = membership;

  const assignForm = useForm<AssignMembershipFormValues>({
    resolver: zodResolver(assignMembershipFormSchema),
    defaultValues: { planId: "", feeType: "standard", waivedReason: "", priceOverride: "", startDate: "", renewalDate: "", notes: "" },
  });
  // useWatch (not assignForm.watch) specifically to avoid the
  // react-hooks/incompatible-library warning: watch() is a method
  // returned by useForm() and isn't itself a hook the compiler can
  // recognize, whereas useWatch is a real hook with identical
  // behavior (subscribes to this one field, re-renders on change).
  const watchedFeeType = useWatch({ control: assignForm.control, name: "feeType" });

  const termsForm = useForm<UpdateMembershipTermsFormValues>({
    resolver: zodResolver(updateMembershipTermsFormSchema),
    defaultValues: current
      ? {
          feeType: current.feeType,
          waivedReason: current.waivedReason ?? "",
          startDate: current.startDate ?? "",
          renewalDate: current.renewalDate ?? "",
          notes: current.notes ?? "",
        }
      : { feeType: "standard", waivedReason: "", startDate: "", renewalDate: "", notes: "" },
  });

  const statusForm = useForm<ChangeMembershipStatusFormValues>({
    resolver: zodResolver(changeMembershipStatusFormSchema),
    // This dialog ("End Membership") only ever offers cancelled/expired as
    // selectable options below, so the default must be one of those two —
    // never "active", which isn't a registered item in this Select's list.
    defaultValues: { status: "cancelled", note: "" },
  });

  const invoiceForm = useForm<LinkInvoiceFormValues>({
    resolver: zodResolver(linkInvoiceFormSchema),
    defaultValues: { invoiceId: current?.invoiceId ?? "" },
  });

  const overrideForm = useForm<BenefitOverrideFormValues>({
    resolver: zodResolver(benefitOverrideFormSchema),
    defaultValues: { benefitId: "", overrideType: "include", note: "" },
  });

  // useForm's defaultValues are only read once, at mount — this component is
  // already mounted (with `current: null`) before any membership exists, so
  // termsForm/invoiceForm's initial defaults go stale the moment a real
  // membership is assigned without a full remount. Re-sync them with the
  // latest `current` each time their dialog opens, so "Edit Terms"/"Link
  // Invoice" never shows (and could silently resubmit) outdated values.
  useEffect(() => {
    if (termsOpen && current) {
      termsForm.reset({
        feeType: current.feeType,
        waivedReason: current.waivedReason ?? "",
        startDate: current.startDate ?? "",
        renewalDate: current.renewalDate ?? "",
        notes: current.notes ?? "",
      });
    }
  }, [termsOpen, current, termsForm]);

  useEffect(() => {
    if (invoiceOpen) {
      invoiceForm.reset({ invoiceId: current?.invoiceId ?? "" });
    }
  }, [invoiceOpen, current, invoiceForm]);

  function submitAssign(values: AssignMembershipFormValues) {
    setError(null);
    startTransition(async () => {
      try {
        await onAssign(allianceId, values);
        setAssignOpen(false);
        assignForm.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function submitTerms(values: UpdateMembershipTermsFormValues) {
    setError(null);
    startTransition(async () => {
      try {
        await onUpdateTerms(allianceId, values);
        setTermsOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function submitStatus(values: ChangeMembershipStatusFormValues) {
    setError(null);
    startTransition(async () => {
      try {
        await onChangeStatus(allianceId, values);
        setStatusOpen(false);
        statusForm.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function submitInvoice(values: LinkInvoiceFormValues) {
    setError(null);
    startTransition(async () => {
      try {
        await onLinkInvoice(allianceId, values);
        setInvoiceOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function submitOverride(values: BenefitOverrideFormValues) {
    setError(null);
    startTransition(async () => {
      try {
        await onAddOverride(allianceId, values);
        setOverrideOpen(false);
        overrideForm.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function removeOverride(id: string) {
    startTransition(async () => {
      await onRemoveOverride(allianceId, id);
    });
  }

  const isTerminal = current && (current.status === "cancelled" || current.status === "expired");

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg text-foreground">{t("sectionTitle")}</h2>
        <div className="flex items-center gap-2">
          {current && <Badge variant={statusVariant[current.status]}>{tStatus(current.status)}</Badge>}
          {canManage && (!current || isTerminal) && (
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
              <DialogTrigger render={<Button size="sm" variant="outline" />}>
                <Plus className="h-4 w-4" />
                {t("assignMembership")}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("assignMembership")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={assignForm.handleSubmit(submitAssign)} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>{t("plan")}</Label>
                    <Controller
                      control={assignForm.control}
                      name="planId"
                      render={({ field }) => (
                        <Select
                          value={field.value || "none"}
                          onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectPlan")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" disabled>
                              {t("selectPlan")}
                            </SelectItem>
                            {plans.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {`${p.name}${p.price ? ` ($${Number(p.price).toFixed(2)})` : ""}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {plans.length === 0 && <p className="text-xs text-muted-foreground">{t("noActivePlans")}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>{t("feeType")}</Label>
                    <Controller
                      control={assignForm.control}
                      name="feeType"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {membershipFeeTypeValues.map((v) => (
                              <SelectItem key={v} value={v}>
                                {tFeeType(v)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  {watchedFeeType !== "standard" && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="waivedReason">{t("waivedReason")}</Label>
                      <Textarea id="waivedReason" rows={2} {...assignForm.register("waivedReason")} />
                      {assignForm.formState.errors.waivedReason && (
                        <p className="text-sm text-destructive"><FieldErrorText message={assignForm.formState.errors.waivedReason.message} /></p>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="priceOverride">{t("priceOverride")}</Label>
                    <Input id="priceOverride" type="number" step="0.01" {...assignForm.register("priceOverride")} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="startDate">{t("startDate")}</Label>
                      <Input id="startDate" type="date" {...assignForm.register("startDate")} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="renewalDate">{t("renewalDate")}</Label>
                      <Input id="renewalDate" type="date" {...assignForm.register("renewalDate")} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="assignNotes">{t("notes")}</Label>
                    <Textarea id="assignNotes" rows={2} {...assignForm.register("notes")} />
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
          {canManage && current && !isTerminal && (
            <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
              <DialogTrigger render={<Button size="sm" variant="outline" />}>
                <Pencil className="h-4 w-4" />
                {t("editTerms")}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("editTerms")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={termsForm.handleSubmit(submitTerms)} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>{t("feeType")}</Label>
                    <Controller
                      control={termsForm.control}
                      name="feeType"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {membershipFeeTypeValues.map((v) => (
                              <SelectItem key={v} value={v}>
                                {tFeeType(v)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="termsWaivedReason">{t("waivedReason")}</Label>
                    <Textarea id="termsWaivedReason" rows={2} {...termsForm.register("waivedReason")} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="termsStartDate">{t("startDate")}</Label>
                      <Input id="termsStartDate" type="date" {...termsForm.register("startDate")} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="termsRenewalDate">{t("renewalDate")}</Label>
                      <Input id="termsRenewalDate" type="date" {...termsForm.register("renewalDate")} />
                    </div>
                  </div>
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

      {!current ? (
        <p className="text-sm text-muted-foreground">{t("noMembership")}</p>
      ) : (
        <>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">{t("plan")}</p>
              <p className="text-foreground">{current.planNameSnapshot}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("feeType")}</p>
              <p className="text-foreground">{tFeeType(current.feeType)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("price")}</p>
              <p className="text-foreground">
                {current.priceSnapshot ? `$${Number(current.priceSnapshot).toFixed(2)}` : "—"}
              </p>
            </div>
            {current.waivedReason && (
              <div className="sm:col-span-3">
                <p className="text-muted-foreground">{t("waivedReason")}</p>
                <p className="text-foreground">{current.waivedReason}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">{t("startDate")}</p>
              <p className="text-foreground">{current.startDate ? formatDate(current.startDate) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("renewalDate")}</p>
              <p className="text-foreground">{current.renewalDate ? formatDate(current.renewalDate) : "—"}</p>
            </div>
            {current.notes && (
              <div className="sm:col-span-3">
                <p className="text-muted-foreground">{t("notes")}</p>
                <p className="whitespace-pre-wrap text-foreground">{current.notes}</p>
              </div>
            )}
          </div>

          {canManage && !isTerminal && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {current.status === "pending" && (
                <Button size="sm" disabled={isPending} onClick={() => startTransition(() => onChangeStatus(allianceId, { status: "active", note: "" }))}>
                  <PlayCircle className="h-4 w-4" />
                  {t("activate")}
                </Button>
              )}
              {current.status === "active" && (
                <Button size="sm" variant="outline" disabled={isPending} onClick={() => startTransition(() => onChangeStatus(allianceId, { status: "paused", note: "" }))}>
                  <PauseCircle className="h-4 w-4" />
                  {t("pause")}
                </Button>
              )}
              {current.status === "paused" && (
                <Button size="sm" disabled={isPending} onClick={() => startTransition(() => onChangeStatus(allianceId, { status: "active", note: "" }))}>
                  <PlayCircle className="h-4 w-4" />
                  {t("reactivate")}
                </Button>
              )}
              <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
                <DialogTrigger render={<Button size="sm" variant="outline" />}>
                  <XCircle className="h-4 w-4" />
                  {t("endMembership")}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("endMembership")}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={statusForm.handleSubmit(submitStatus)} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label>{t("newStatus")}</Label>
                      <Controller
                        control={statusForm.control}
                        name="status"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allianceMembershipStatusValues
                                .filter((v) => v === "cancelled" || v === "expired")
                                .map((v) => (
                                  <SelectItem key={v} value={v}>
                                    {tStatus(v)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="statusNote">{t("note")}</Label>
                      <Textarea id="statusNote" rows={2} {...statusForm.register("note")} />
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
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">{t("includedBenefits")}</h3>
              {canManage && (
                <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
                  <DialogTrigger render={<Button size="sm" variant="outline" />}>
                    <Plus className="h-3.5 w-3.5" />
                    {t("addOverride")}
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("addOverride")}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={overrideForm.handleSubmit(submitOverride)} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label>{t("benefit")}</Label>
                        <Controller
                          control={overrideForm.control}
                          name="benefitId"
                          render={({ field }) => (
                            <Select
                              value={field.value || "none"}
                              onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("selectBenefit")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" disabled>
                                  {t("selectBenefit")}
                                </SelectItem>
                                {benefits.map((b) => (
                                  <SelectItem key={b.id} value={b.id}>
                                    {b.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>{t("overrideType")}</Label>
                        <Controller
                          control={overrideForm.control}
                          name="overrideType"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {membershipBenefitOverrideTypeValues.map((v) => (
                                  <SelectItem key={v} value={v}>
                                    {tOverrideType(v)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="overrideNote">{t("note")}</Label>
                        <Textarea id="overrideNote" rows={2} {...overrideForm.register("note")} />
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
            {membership.effectiveBenefits.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noBenefitsIncluded")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {membership.effectiveBenefits.map((b) => (
                  <Badge key={b.id} variant="outline">
                    {b.name}
                  </Badge>
                ))}
              </div>
            )}
            {membership.overrides.length > 0 && (
              <ul className="flex flex-col divide-y divide-border">
                {membership.overrides.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="text-foreground">
                      {tOverrideType(o.overrideType)}: {o.benefitName}
                      {o.note ? ` — ${o.note}` : ""}
                    </span>
                    {canManage && (
                      <Button size="sm" variant="outline" disabled={isPending} onClick={() => removeOverride(o.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("remove")}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">{t("linkedInvoice")}</h3>
              {(canManage || canLinkInvoice) && (
                <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
                  <DialogTrigger render={<Button size="sm" variant="outline" />}>
                    <Link2 className="h-3.5 w-3.5" />
                    {t("linkInvoice")}
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("linkInvoice")}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={invoiceForm.handleSubmit(submitInvoice)} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label>{t("invoice")}</Label>
                        <Controller
                          control={invoiceForm.control}
                          name="invoiceId"
                          render={({ field }) => (
                            <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                              <SelectTrigger>
                                <SelectValue placeholder={t("selectInvoice")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">{t("noInvoice")}</SelectItem>
                                {linkableInvoices.map((inv) => (
                                  <SelectItem key={inv.id} value={inv.id}>
                                    {`INV-${String(inv.invoiceSeq).padStart(5, "0")} ($${Number(inv.total).toFixed(2)})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {linkableInvoices.length === 0 && (
                          <p className="text-xs text-muted-foreground">{t("noLinkableInvoices")}</p>
                        )}
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
            {membership.invoice ? (
              <p className="text-sm text-foreground">
                INV-{String(membership.invoice.invoiceSeq).padStart(5, "0")} — ${Number(membership.invoice.total).toFixed(2)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noInvoiceLinked")}</p>
            )}
            <p className="text-xs text-muted-foreground">{t("noBankReconciliationNote")}</p>
          </div>

          {membership.statusHistory.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <h3 className="text-sm font-medium text-muted-foreground">{t("statusHistory")}</h3>
              {membership.statusHistory.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center gap-2 text-sm">
                  {entry.previousStatus && (
                    <>
                      <Badge variant={statusVariant[entry.previousStatus]}>{tStatus(entry.previousStatus)}</Badge>
                      <span className="text-muted-foreground">→</span>
                    </>
                  )}
                  <Badge variant={statusVariant[entry.newStatus]}>{tStatus(entry.newStatus)}</Badge>
                  <span className="text-muted-foreground">{formatDateTime(entry.changedAt)}</span>
                  {entry.changedByEmail && <Badge variant="outline">{entry.changedByEmail}</Badge>}
                  {entry.note && <span className="text-muted-foreground">({entry.note})</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {membership.history.length > 1 && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <h3 className="text-sm font-medium text-muted-foreground">{t("membershipHistory")}</h3>
          <ul className="flex flex-col divide-y divide-border">
            {membership.history.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-foreground">{m.planNameSnapshot}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant={statusVariant[m.status]}>{tStatus(m.status)}</Badge>
                  {m.startDate ? formatDate(m.startDate) : "—"}
                  {m.id === membership.current?.id && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

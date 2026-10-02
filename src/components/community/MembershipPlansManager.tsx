"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createMembershipPlanAction,
  updateMembershipPlanAction,
  setMembershipPlanActiveAction,
  createMembershipBenefitAction,
  updateMembershipBenefitAction,
  setMembershipBenefitActiveAction,
} from "@/app/[locale]/(app)/community/membership-plans/actions";
import {
  membershipBillingModelValues,
  membershipBillingFrequencyValues,
  type MembershipPlanFormValues,
  type MembershipBenefitFormValues,
} from "@/lib/validation/membership";
import type { MembershipPlan, MembershipBenefit } from "@/lib/db/schema";

const EMPTY_PLAN: MembershipPlanFormValues = {
  name: "",
  description: "",
  billingModel: "free",
  price: "",
  billingFrequency: "",
  currency: "USD",
  benefitsSummary: "",
  displayOrder: "",
  benefitIds: [],
};

const EMPTY_BENEFIT: MembershipBenefitFormValues = {
  name: "",
  description: "",
  category: "",
  internalNotes: "",
};

export function MembershipPlansManager({
  plans,
  benefits,
  membershipCounts,
  planBenefitIds,
}: {
  plans: MembershipPlan[];
  benefits: MembershipBenefit[];
  membershipCounts: Record<string, number>;
  planBenefitIds: Record<string, string[]>;
}) {
  const t = useTranslations("Membership");
  const tBillingModel = useTranslations("MembershipBillingModel");
  const tBillingFrequency = useTranslations("MembershipBillingFrequency");

  return (
    <Tabs defaultValue="plans">
      <TabsList>
        <TabsTrigger value="plans">
          {t("tabPlans")} ({plans.length})
        </TabsTrigger>
        <TabsTrigger value="benefits">
          {t("tabBenefits")} ({benefits.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="plans" className="pt-4">
        <PlansSection
          plans={plans}
          benefits={benefits}
          membershipCounts={membershipCounts}
          planBenefitIds={planBenefitIds}
          t={t}
          tBillingModel={tBillingModel}
          tBillingFrequency={tBillingFrequency}
        />
      </TabsContent>
      <TabsContent value="benefits" className="pt-4">
        <BenefitsSection benefits={benefits} t={t} />
      </TabsContent>
    </Tabs>
  );
}

function PlansSection({
  plans,
  benefits,
  membershipCounts,
  planBenefitIds,
  t,
  tBillingModel,
  tBillingFrequency,
}: {
  plans: MembershipPlan[];
  benefits: MembershipBenefit[];
  membershipCounts: Record<string, number>;
  planBenefitIds: Record<string, string[]>;
  t: ReturnType<typeof useTranslations>;
  tBillingModel: ReturnType<typeof useTranslations>;
  tBillingFrequency: ReturnType<typeof useTranslations>;
}) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MembershipPlanFormValues | null>(null);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<MembershipPlanFormValues>(EMPTY_PLAN);
  const [error, setError] = useState<string | null>(null);

  function startEdit(plan: MembershipPlan) {
    setEditingId(plan.id);
    setDraft({
      name: plan.name,
      description: plan.description ?? "",
      billingModel: plan.billingModel,
      price: plan.price ?? "",
      billingFrequency: plan.billingFrequency ?? "",
      currency: plan.currency,
      benefitsSummary: plan.benefitsSummary ?? "",
      displayOrder: String(plan.displayOrder),
      benefitIds: planBenefitIds[plan.id] ?? [],
    });
    setError(null);
  }

  function saveNew() {
    setError(null);
    startTransition(async () => {
      try {
        await createMembershipPlanAction(newDraft);
        setCreating(false);
        setNewDraft(EMPTY_PLAN);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function saveEdit(id: string) {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateMembershipPlanAction(id, draft);
        setEditingId(null);
        setDraft(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function toggleActive(plan: MembershipPlan) {
    startTransition(async () => {
      await setMembershipPlanActiveAction(plan.id, !plan.isActive);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {!creating && (
        <div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setCreating(true);
              setNewDraft(EMPTY_PLAN);
              setError(null);
            }}
          >
            <Plus className="h-4 w-4" />
            {t("addPlan")}
          </Button>
        </div>
      )}

      {creating && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <PlanFields draft={newDraft} onChange={setNewDraft} benefits={benefits} t={t} tBillingModel={tBillingModel} tBillingFrequency={tBillingFrequency} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" size="sm" disabled={isPending} onClick={saveNew}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {plans.length === 0 && (
          <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {t("noPlans")}
          </p>
        )}
        {plans.map((plan) => (
          <div key={plan.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            {editingId === plan.id && draft ? (
              <>
                <PlanFields draft={draft} onChange={setDraft} benefits={benefits} t={t} tBillingModel={tBillingModel} tBillingFrequency={tBillingFrequency} />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingId(null); setDraft(null); }}>
                    <X className="h-4 w-4" />
                    {t("cancel")}
                  </Button>
                  <Button type="button" size="sm" disabled={isPending} onClick={() => saveEdit(plan.id)}>
                    {isPending ? t("saving") : t("save")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium text-foreground">
                    {plan.name} {!plan.isActive && <Badge variant="outline">{t("inactive")}</Badge>}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {tBillingModel(plan.billingModel)}
                    {plan.price ? ` · $${Number(plan.price).toFixed(2)}` : ""}
                    {plan.billingFrequency ? ` / ${tBillingFrequency(plan.billingFrequency)}` : ""}
                    {" · "}
                    {t("membershipCount", { count: membershipCounts[plan.id] ?? 0 })}
                  </span>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => toggleActive(plan)}>
                  {plan.isActive ? t("deactivate") : t("activate")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => startEdit(plan)}>
                  <Pencil className="h-4 w-4" />
                  {t("edit")}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanFields({
  draft,
  onChange,
  benefits,
  t,
  tBillingModel,
  tBillingFrequency,
}: {
  draft: MembershipPlanFormValues;
  onChange: (draft: MembershipPlanFormValues) => void;
  benefits: MembershipBenefit[];
  t: ReturnType<typeof useTranslations>;
  tBillingModel: ReturnType<typeof useTranslations>;
  tBillingFrequency: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label>{t("planName")}</Label>
        <Input value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label>{t("description")}</Label>
        <Textarea
          rows={2}
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("billingModel")}</Label>
        <Select
          value={draft.billingModel}
          onValueChange={(v) => v && onChange({ ...draft, billingModel: v as MembershipPlanFormValues["billingModel"] })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {membershipBillingModelValues.map((v) => (
              <SelectItem key={v} value={v}>
                {tBillingModel(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("price")}</Label>
        <Input
          type="number"
          step="0.01"
          value={draft.price}
          onChange={(e) => onChange({ ...draft, price: e.target.value })}
          placeholder="0.00"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("billingFrequency")}</Label>
        <Select
          value={draft.billingFrequency || "none"}
          onValueChange={(v) => onChange({ ...draft, billingFrequency: v === "none" ? "" : (v as MembershipPlanFormValues["billingFrequency"]) })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("selectFrequency")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("selectFrequency")}</SelectItem>
            {membershipBillingFrequencyValues.map((v) => (
              <SelectItem key={v} value={v}>
                {tBillingFrequency(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("displayOrder")}</Label>
        <Input
          type="number"
          value={draft.displayOrder}
          onChange={(e) => onChange({ ...draft, displayOrder: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label>{t("benefitsSummary")}</Label>
        <Textarea
          rows={2}
          value={draft.benefitsSummary}
          onChange={(e) => onChange({ ...draft, benefitsSummary: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label>{t("includedBenefits")}</Label>
        <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
          {benefits.length === 0 && <p className="text-sm text-muted-foreground">{t("noBenefitsYet")}</p>}
          {benefits.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.benefitIds.includes(b.id)}
                onCheckedChange={(checked) =>
                  onChange({
                    ...draft,
                    benefitIds: checked
                      ? [...draft.benefitIds, b.id]
                      : draft.benefitIds.filter((id) => id !== b.id),
                  })
                }
              />
              {b.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function BenefitsSection({ benefits, t }: { benefits: MembershipBenefit[]; t: ReturnType<typeof useTranslations> }) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MembershipBenefitFormValues | null>(null);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<MembershipBenefitFormValues>(EMPTY_BENEFIT);
  const [error, setError] = useState<string | null>(null);

  function startEdit(b: MembershipBenefit) {
    setEditingId(b.id);
    setDraft({
      name: b.name,
      description: b.description ?? "",
      category: b.category ?? "",
      internalNotes: b.internalNotes ?? "",
    });
    setError(null);
  }

  function saveNew() {
    setError(null);
    startTransition(async () => {
      try {
        await createMembershipBenefitAction(newDraft);
        setCreating(false);
        setNewDraft(EMPTY_BENEFIT);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function saveEdit(id: string) {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateMembershipBenefitAction(id, draft);
        setEditingId(null);
        setDraft(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function toggleActive(b: MembershipBenefit) {
    startTransition(async () => {
      await setMembershipBenefitActiveAction(b.id, !b.isActive);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {!creating && (
        <div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setCreating(true);
              setNewDraft(EMPTY_BENEFIT);
              setError(null);
            }}
          >
            <Plus className="h-4 w-4" />
            {t("addBenefit")}
          </Button>
        </div>
      )}

      {creating && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <BenefitFields draft={newDraft} onChange={setNewDraft} t={t} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" size="sm" disabled={isPending} onClick={saveNew}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {benefits.length === 0 && (
          <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {t("noBenefitsYet")}
          </p>
        )}
        {benefits.map((b) => (
          <div key={b.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            {editingId === b.id && draft ? (
              <>
                <BenefitFields draft={draft} onChange={setDraft} t={t} />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingId(null); setDraft(null); }}>
                    <X className="h-4 w-4" />
                    {t("cancel")}
                  </Button>
                  <Button type="button" size="sm" disabled={isPending} onClick={() => saveEdit(b.id)}>
                    {isPending ? t("saving") : t("save")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium text-foreground">
                    {b.name} {!b.isActive && <Badge variant="outline">{t("inactive")}</Badge>}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {b.category || t("noCategory")}
                  </span>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => toggleActive(b)}>
                  {b.isActive ? t("deactivate") : t("activate")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => startEdit(b)}>
                  <Pencil className="h-4 w-4" />
                  {t("edit")}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BenefitFields({
  draft,
  onChange,
  t,
}: {
  draft: MembershipBenefitFormValues;
  onChange: (draft: MembershipBenefitFormValues) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label>{t("benefitName")}</Label>
        <Input value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("category")}</Label>
        <Input value={draft.category} onChange={(e) => onChange({ ...draft, category: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label>{t("description")}</Label>
        <Textarea rows={2} value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label>{t("internalNotes")}</Label>
        <Textarea rows={2} value={draft.internalNotes} onChange={(e) => onChange({ ...draft, internalNotes: e.target.value })} />
      </div>
    </div>
  );
}

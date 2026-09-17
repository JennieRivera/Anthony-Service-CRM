"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createServiceCatalogItemAction,
  updateServiceCatalogItemAction,
  toggleServiceCatalogItemActiveAction,
} from "@/app/[locale]/(app)/settings/service-catalog/actions";
import { serviceTypeValues } from "@/lib/validation/client";
import type { ServiceCatalogItemFormValues } from "@/lib/validation/serviceCatalog";
import type { ServiceCatalogItem } from "@/lib/db/schema";

type Draft = ServiceCatalogItemFormValues;

const EMPTY_DRAFT: Draft = {
  name: "",
  serviceType: serviceTypeValues[0],
  price: "",
  active: true,
  notes: "",
};

function toDraft(item: ServiceCatalogItem): Draft {
  return {
    name: item.name,
    serviceType: item.serviceType,
    price: item.price,
    active: item.active,
    notes: item.notes ?? "",
  };
}

export function ServiceCatalogManager({ items }: { items: ServiceCatalogItem[] }) {
  const t = useTranslations("ServiceCatalog");
  const tService = useTranslations("ServiceType");
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);

  function startEdit(item: ServiceCatalogItem) {
    setEditingId(item.id);
    setDraft(toDraft(item));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setError(null);
  }

  function saveEdit(id: string) {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateServiceCatalogItemAction(id, draft);
        setEditingId(null);
        setDraft(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function saveNew() {
    setError(null);
    startTransition(async () => {
      try {
        await createServiceCatalogItemAction(newDraft);
        setCreating(false);
        setNewDraft(EMPTY_DRAFT);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function toggleActive(item: ServiceCatalogItem) {
    startTransition(async () => {
      await toggleServiceCatalogItemActiveAction(item.id, !item.active);
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
              setNewDraft(EMPTY_DRAFT);
              setError(null);
            }}
          >
            <Plus className="h-4 w-4" />
            {t("addService")}
          </Button>
        </div>
      )}

      {creating && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <ServiceCatalogFields
            draft={newDraft}
            onChange={setNewDraft}
            t={t}
            tService={tService}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setError(null);
              }}
            >
              {t("cancel")}
            </Button>
            <Button type="button" size="sm" disabled={isPending} onClick={saveNew}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
          >
            {editingId === item.id && draft ? (
              <>
                <ServiceCatalogFields draft={draft} onChange={setDraft} t={t} tService={tService} />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                    {t("cancel")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() => saveEdit(item.id)}
                  >
                    {isPending ? t("saving") : t("save")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium text-foreground">{item.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {tService(item.serviceType)} · ${item.price}
                    {!item.active && ` · ${t("inactive")}`}
                  </span>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => toggleActive(item)}>
                  {item.active ? t("deactivate") : t("activate")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => startEdit(item)}>
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

function ServiceCatalogFields({
  draft,
  onChange,
  t,
  tService,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  t: ReturnType<typeof useTranslations>;
  tService: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label>{t("serviceName")}</Label>
        <Input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder={t("serviceNamePlaceholder")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("serviceType")}</Label>
        <Select
          value={draft.serviceType}
          onValueChange={(value) => value && onChange({ ...draft, serviceType: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {serviceTypeValues.map((type) => (
              <SelectItem key={type} value={type}>
                {tService(type)}
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
          min="0"
          value={draft.price}
          onChange={(e) => onChange({ ...draft, price: e.target.value })}
          placeholder="0.00"
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label>{t("notes")}</Label>
        <Input
          value={draft.notes}
          onChange={(e) => onChange({ ...draft, notes: e.target.value })}
        />
      </div>
    </div>
  );
}

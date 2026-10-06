"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPriceFrom } from "@/lib/partners/format";

type Service = { id: string; name: string; description: string | null; serviceArea: string | null; priceFrom: string | null };
type Draft = { name: string; description: string; serviceArea: string; priceFrom: string };
const EMPTY: Draft = { name: "", description: "", serviceArea: "", priceFrom: "" };

// "My services": the alliance adds, edits and removes the services it
// offers. Each change applies right away and AMS gets a review task.
export function PartnerServicesEditor({ services, max }: { services: Service[]; max: number }) {
  const t = useTranslations("Partners.services");
  const locale = useLocale();
  const router = useRouter();
  // null = closed; "new" = adding; otherwise the id being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = (s?: Service) => {
    setError(null);
    setEditing(s ? s.id : "new");
    setDraft(s ? { name: s.name, description: s.description ?? "", serviceArea: s.serviceArea ?? "", priceFrom: s.priceFrom ?? "" } : EMPTY);
  };
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(t.has(`errors.${data.error}`) ? t(`errors.${data.error}`) : t("errors.generic"));
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError(t("errors.generic"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError(t("errors.name"));
      return;
    }
    const ok =
      editing === "new"
        ? await call("/api/partners/services", "POST", { values: draft })
        : await call(`/api/partners/services/${editing}`, "PUT", { values: draft });
    if (ok) setEditing(null);
  }

  const form = (
    <form onSubmit={save} className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="svc-name">{t("fields.name")}</Label>
        <Input id="svc-name" value={draft.name} onChange={set("name")} maxLength={120} className="h-11" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="svc-description">{t("fields.description")}</Label>
        <Textarea id="svc-description" rows={2} value={draft.description} onChange={set("description")} maxLength={500} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="svc-area">{t("fields.serviceArea")}</Label>
          <Input id="svc-area" value={draft.serviceArea} onChange={set("serviceArea")} maxLength={200} className="h-11" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="svc-price">{t("fields.priceFrom")}</Label>
          <Input id="svc-price" inputMode="decimal" value={draft.priceFrom} onChange={set("priceFrom")} placeholder="$" className="h-11" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy} className="h-11">
          {busy ? t("saving") : t("save")}
        </Button>
        <Button type="button" variant="outline" disabled={busy} className="h-11" onClick={() => setEditing(null)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>

      {services.length === 0 && editing !== "new" && <p className="text-sm text-muted-foreground">{t("empty")}</p>}

      <ul className="flex flex-col gap-2">
        {services.map((s) =>
          editing === s.id ? (
            <li key={s.id}>{form}</li>
          ) : (
            <li key={s.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium text-foreground">{s.name}</span>
                {s.description && <span className="text-sm text-muted-foreground">{s.description}</span>}
                <span className="text-xs text-muted-foreground">
                  {[s.serviceArea, s.priceFrom ? t("from", { price: formatPriceFrom(s.priceFrom, locale) ?? "" }) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label={t("edit", { name: s.name })} disabled={busy} onClick={() => open(s)}>
                  <Pencil className="size-4" />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button type="button" variant="ghost" size="icon" aria-label={t("remove", { name: s.name })} disabled={busy}>
                      <Trash2 className="size-4" />
                    </Button>
                  }
                  title={t("removeConfirm", { name: s.name })}
                  description={t("removeHint")}
                  confirmLabel={t("removeButton")}
                  cancelLabel={t("cancel")}
                  onConfirm={async () => {
                    await call(`/api/partners/services/${s.id}`, "DELETE");
                  }}
                />
              </div>
            </li>
          ),
        )}
      </ul>

      {editing === "new" ? (
        form
      ) : (
        services.length < max && (
          <Button type="button" variant="outline" className="h-11 w-fit" onClick={() => open()} disabled={busy}>
            <Plus className="size-4" />
            {t("add")}
          </Button>
        )
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

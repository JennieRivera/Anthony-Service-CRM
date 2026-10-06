"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientForUploadAction } from "@/app/[locale]/(app)/clients/actions";

type ClientOption = { id: string; fullName: string };

const MAX_RESULTS = 8;

// Communications "Register": search an existing client by name, or create
// a Lead on the spot (name + optional phone/email) without leaving the form.
export function ClientPickerWithLead({
  clients,
  value,
  onChange,
}: {
  clients: ClientOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const t = useTranslations("Communications.form");
  const [extra, setExtra] = useState<ClientOption[]>([]);
  const all = useMemo(() => [...extra, ...clients], [extra, clients]);
  const selected = all.find((c) => c.id === value) ?? null;
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [lead, setLead] = useState({ fullName: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const matches = q ? all.filter((c) => c.fullName.toLowerCase().includes(q)).slice(0, MAX_RESULTS) : [];

  async function createLead() {
    if (!lead.fullName.trim()) {
      setError(t("leadNameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = await createClientForUploadAction({
        fullName: lead.fullName.trim(),
        phone: lead.phone.trim(),
        email: lead.email.trim(),
        preferredLanguage: "es",
        status: "lead",
        referralSource: "",
        interestedServices: [],
        notes: "",
        companyId: "",
        folderNumber: "",
      });
      setExtra((prev) => [{ id, fullName: lead.fullName.trim() }, ...prev]);
      onChange(id);
      setCreating(false);
      setLead({ fullName: "", phone: "", email: "" });
      setQuery("");
    } catch {
      setError(t("leadError"));
    } finally {
      setSaving(false);
    }
  }

  if (selected) {
    return (
      <div className="flex min-h-9 items-center justify-between gap-2 rounded-md border border-input px-3 py-1.5 text-sm">
        <span className="truncate text-foreground">{selected.fullName}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
          <X className="h-4 w-4" />
          {t("changeClient")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchClient")}
          className="pl-8"
          aria-label={t("searchClient")}
        />
      </div>
      {q && (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {matches.length === 0 && <li className="p-2 text-sm text-muted-foreground">{t("noClientFound")}</li>}
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full cursor-pointer p-2 text-left text-sm text-foreground hover:bg-secondary/50"
                onClick={() => {
                  onChange(c.id);
                  setQuery("");
                }}
              >
                {c.fullName}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!creating ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => {
            setCreating(true);
            setLead((l) => ({ ...l, fullName: query.trim() }));
          }}
        >
          <UserPlus className="h-4 w-4" />
          {t("createLead")}
        </Button>
      ) : (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
          <p className="text-sm font-medium text-foreground">{t("newLead")}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-name">{t("leadName")}</Label>
            <Input
              id="lead-name"
              value={lead.fullName}
              onChange={(e) => setLead({ ...lead, fullName: e.target.value })}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-phone">{t("leadPhone")}</Label>
              <Input id="lead-phone" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-email">{t("leadEmail")}</Label>
              <Input
                id="lead-email"
                type="email"
                value={lead.email}
                onChange={(e) => setLead({ ...lead, email: e.target.value })}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={createLead}>
              {saving ? t("saving") : t("saveLead")}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => setCreating(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

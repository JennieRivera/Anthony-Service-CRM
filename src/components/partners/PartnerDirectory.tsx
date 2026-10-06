"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Network, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DirectoryEntry } from "@/lib/partners/directory";
import { SendReferralForm } from "./PartnerReferrals";

// The allies an authorized ally can refer to directly. Only name, type,
// services, city and logo — never contact details.
export function PartnerDirectory({ entries, services }: { entries: DirectoryEntry[]; services: readonly string[] }) {
  const t = useTranslations("Partners.directory");
  const tType = useTranslations("OrganizationType");
  const [query, setQuery] = useState("");
  const [referTo, setReferTo] = useState<DirectoryEntry | null>(null);

  const q = query.trim().toLowerCase();
  const shown = entries.filter(
    (e) => !q || [e.name, e.city, e.type ? tType(e.type) : null, ...e.services].filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
  );

  if (referTo) {
    return (
      <div className="flex flex-col gap-3">
        <Button type="button" variant="outline" className="h-11 w-fit" onClick={() => setReferTo(null)}>
          {t("back")}
        </Button>
        <SendReferralForm services={services} directTo={{ id: referTo.id, name: referTo.name }} title={t("referTitle", { name: referTo.name })} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="h-11 pl-9" />
      </div>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((e) => (
            <li key={e.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                {e.hasLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/partners/directory/${e.id}/logo`} alt="" className="size-12 shrink-0 rounded-md border border-border object-cover" />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                    <Network className="size-5" aria-hidden />
                  </span>
                )}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium text-foreground">{e.name}</span>
                  <span className="text-sm text-muted-foreground">{[e.type ? tType(e.type) : null, e.city].filter(Boolean).join(" · ")}</span>
                </div>
              </div>
              {e.services.length > 0 && <p className="text-sm text-foreground">{e.services.join(", ")}</p>}
              <Button type="button" className="h-11 w-full sm:w-fit" onClick={() => setReferTo(e)}>
                <Send className="size-4" aria-hidden />
                {t("refer")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

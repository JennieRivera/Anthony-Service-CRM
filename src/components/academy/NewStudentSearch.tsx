"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { DuplicateMatchList } from "@/components/clients/DuplicateMatchList";
import { findPossibleDuplicateClientsAction } from "@/app/[locale]/(app)/clients/actions";
import type { ClientDuplicateMatch } from "@/lib/queries/clients";

// Phase 2A — Master Person Identity Safety Net. Reuses the same
// findPossibleDuplicateClients matching logic as the New Client dialog, but
// here it's the primary flow (search first), not a late warning: a match
// goes straight into /cases/new?serviceType=academy&clientId=... — no
// second clients row is ever created for someone the CRM already knows.
export function NewStudentSearch() {
  const t = useTranslations("Academy");
  const tDup = useTranslations("DuplicateMatch");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<ClientDuplicateMatch[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function runSearch() {
    startTransition(async () => {
      const found = await findPossibleDuplicateClientsAction({
        fullName: name,
        email,
        phone,
      });
      setResults(found);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg text-foreground">
          {t("newStudentSearchTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("newStudentSearchHint")}</p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="searchName">{tDup("searchByName")}</Label>
            <Input id="searchName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="searchEmail">{tDup("searchByEmail")}</Label>
            <Input
              id="searchEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="searchPhone">{tDup("searchByPhone")}</Label>
            <Input id="searchPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <Button type="button" className="w-fit" disabled={isPending} onClick={runSearch}>
          <Search className="h-4 w-4" />
          {isPending ? tDup("searching") : tDup("search")}
        </Button>

        {results && results.length === 0 && (
          <p className="text-sm text-muted-foreground">{tDup("noMatchesFound")}</p>
        )}

        {results && results.length > 0 && (
          <DuplicateMatchList
            matches={results}
            renderActions={(match) => (
              <Button
                type="button"
                size="sm"
                render={<Link href={`/cases/new?serviceType=academy&clientId=${match.id}`} />}
              >
                {t("enrollThisPerson")}
              </Button>
            )}
          />
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-6">
        <h2 className="font-heading text-lg text-foreground">{t("newPersonHeading")}</h2>
        <p className="text-sm text-muted-foreground">{t("newPersonHint")}</p>
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          render={<Link href="/clients/new?serviceType=academy" />}
        >
          {t("createNewPersonButton")}
        </Button>
      </div>
    </div>
  );
}

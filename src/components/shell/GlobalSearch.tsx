"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { globalSearchAction } from "./actions";
import type { GlobalSearchResult, GlobalSearchResults } from "@/lib/queries/globalSearch";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

const EMPTY_RESULTS: GlobalSearchResults = {
  clients: [],
  cases: [],
  companies: [],
  appointments: [],
  referrals: [],
  invoices: [],
  documents: [],
};

export function GlobalSearch() {
  const t = useTranslations("Nav");
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY_RESULTS);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    // Below the minimum length, just leave any previous results/loading
    // state as-is — the render below never shows the panel unless
    // `hasQuery` is true, so there's nothing to reset here.
    if (trimmed.length < MIN_QUERY_LENGTH) {
      return;
    }

    const timeout = setTimeout(() => {
      globalSearchAction(trimmed)
        .then(setResults)
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const groups: { label: string; items: GlobalSearchResult[] }[] = [
    { label: t("searchClients"), items: results.clients },
    { label: t("searchCases"), items: results.cases },
    { label: t("searchCompanies"), items: results.companies },
    { label: t("searchAppointments"), items: results.appointments },
    { label: t("searchReferrals"), items: results.referrals },
    { label: t("searchInvoices"), items: results.invoices },
    { label: t("searchDocuments"), items: results.documents },
  ].filter((group) => group.items.length > 0);

  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH;
  const hasResults = groups.length > 0;
  const firstResult = groups[0]?.items[0];

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={t("search")}
        className="pl-9"
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          setOpen(true);
          setLoading(value.trim().length >= MIN_QUERY_LENGTH);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && firstResult) {
            goTo(firstResult.href);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && hasQuery && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {!loading && !hasResults && (
            <p className="px-2.5 py-2 text-sm text-muted-foreground">
              {t("noSearchResults")}
            </p>
          )}
          {groups.map((group) => (
            <div key={group.label} className="py-1">
              <p className="px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full flex-col items-start gap-0 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => goTo(item.href)}
                >
                  <span className="truncate">{item.label}</span>
                  {item.sublabel && (
                    <span className="truncate text-xs text-muted-foreground">
                      {item.sublabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

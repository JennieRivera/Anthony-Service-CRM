"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { List, Network, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExportMenu } from "@/components/export/ExportMenu";
import { AllianceConvertButton } from "@/components/alliances/AllianceConvertButton";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { DirectoryRow } from "@/lib/queries/allianceDirectory";

const ACTIVE = ["active_partner", "member"];
const AMS = "__ams__";

// Staff-only directory of every ally: table or tree (AMS → its allies →
// the allies each one added), with search, filters and export.
export function AllianceDirectory({ rows, canExport, canEdit }: { rows: DirectoryRow[]; canExport: boolean; canEdit: boolean }) {
  const t = useTranslations("AllianceDirectory");
  const tType = useTranslations("OrganizationType");
  const tStatus = useTranslations("AllianceStatus");
  const [view, setView] = useState<"table" | "tree">("table");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [addedBy, setAddedBy] = useState("");

  const cities = useMemo(() => [...new Set(rows.map((r) => r.city).filter((c): c is string => Boolean(c)))].sort(), [rows]);
  const types = useMemo(() => [...new Set(rows.map((r) => r.organizationType).filter((c): c is string => Boolean(c)))], [rows]);
  const adders = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => r.addedByAllianceId && m.set(r.addedByAllianceId, r.addedByName ?? "—"));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!q ||
          [r.organizationName, r.contactPerson, r.phone, r.email, r.city, ...r.services]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(q))) &&
        (!type || r.organizationType === type) &&
        (!status || (status === "active" ? ACTIVE.includes(r.status) : status === "prospect" ? r.status === "prospect" : !ACTIVE.includes(r.status) && r.status !== "prospect")) &&
        (!city || r.city === city) &&
        (!addedBy || (addedBy === AMS ? !r.addedByAllianceId : r.addedByAllianceId === addedBy)),
    );
  }, [rows, query, type, status, city, addedBy]);

  const select = "h-10 rounded-lg border border-input bg-card px-2 text-sm text-foreground";
  const statusBadge = (s: string) => (
    <Badge variant={ACTIVE.includes(s) ? "default" : "outline"}>{tStatus(s)}</Badge>
  );
  const convert = (r: DirectoryRow) =>
    canEdit && r.addedByAllianceId && !ACTIVE.includes(r.status) ? <AllianceConvertButton allianceId={r.id} size="sm" /> : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="h-10 pl-9" />
        </div>
        <select aria-label={t("filters.type")} value={type} onChange={(e) => setType(e.target.value)} className={select}>
          <option value="">{t("filters.allTypes")}</option>
          {types.map((x) => (
            <option key={x} value={x}>
              {tType(x)}
            </option>
          ))}
        </select>
        <select aria-label={t("filters.status")} value={status} onChange={(e) => setStatus(e.target.value)} className={select}>
          <option value="">{t("filters.allStatuses")}</option>
          <option value="prospect">{tStatus("prospect")}</option>
          <option value="active">{t("filters.active")}</option>
          <option value="other">{t("filters.other")}</option>
        </select>
        <select aria-label={t("filters.city")} value={city} onChange={(e) => setCity(e.target.value)} className={select}>
          <option value="">{t("filters.allCities")}</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select aria-label={t("filters.addedBy")} value={addedBy} onChange={(e) => setAddedBy(e.target.value)} className={select}>
          <option value="">{t("filters.anyone")}</option>
          <option value={AMS}>{t("ams")}</option>
          {adders.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <div className="flex rounded-lg border border-border" role="group" aria-label={t("view")}>
          {(
            [
              ["table", List],
              ["tree", Network],
            ] as const
          ).map(([v, Icon]) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn("flex h-10 items-center gap-1.5 px-3 text-sm", view === v ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary")}
            >
              <Icon className="size-4" aria-hidden />
              {t(`views.${v}`)}
            </button>
          ))}
        </div>
        {canExport && <ExportMenu target={{ kind: "list", list: "alliance_directory", ids: filtered.map((r) => r.id) }} />}
      </div>
      <p className="text-sm text-muted-foreground">{t("count", { count: filtered.length })}</p>

      {view === "table" ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-muted-foreground">
              <tr>
                {["name", "type", "services", "city", "contact", "status", "addedBy", "date"].map((c) => (
                  <th key={c} className="px-3 py-2 font-medium">
                    {t(`columns.${c}`)}
                  </th>
                ))}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-3 py-2">
                    <Link href={`/alliances/${r.id}`} className="font-medium text-foreground underline">
                      {r.organizationName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.organizationType ? tType(r.organizationType) : "—"}</td>
                  <td className="max-w-64 px-3 py-2 text-muted-foreground">{r.services.join(", ") || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{[r.city, r.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {[r.contactPerson, r.phone, r.email].filter(Boolean).map((x) => (
                      <div key={x}>{x}</div>
                    ))}
                  </td>
                  <td className="px-3 py-2">{statusBadge(r.status)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.addedByAllianceId ? (
                      <Link href={`/alliances/${r.addedByAllianceId}`} className="underline">
                        {r.addedByName}
                      </Link>
                    ) : (
                      t("ams")
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt)}</td>
                  <td className="px-3 py-2">{convert(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Tree rows={rows} visible={new Set(filtered.map((r) => r.id))} statusBadge={statusBadge} convert={convert} />
      )}
    </div>
  );
}

// AMS → the allies AMS added → the allies each of those added (and so on).
// Filters keep a branch when the ally or anything under it matches.
function Tree({
  rows,
  visible,
  statusBadge,
  convert,
}: {
  rows: DirectoryRow[];
  visible: Set<string>;
  statusBadge: (s: string) => React.ReactNode;
  convert: (r: DirectoryRow) => React.ReactNode;
}) {
  const t = useTranslations("AllianceDirectory");
  const tType = useTranslations("OrganizationType");
  const children = useMemo(() => {
    const m = new Map<string | null, DirectoryRow[]>();
    const ids = new Set(rows.map((r) => r.id));
    rows.forEach((r) => {
      const parent = r.addedByAllianceId && ids.has(r.addedByAllianceId) ? r.addedByAllianceId : null;
      m.set(parent, [...(m.get(parent) ?? []), r]);
    });
    return m;
  }, [rows]);
  const keep = (r: DirectoryRow, seen = new Set<string>()): boolean => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return visible.has(r.id) || (children.get(r.id) ?? []).some((c) => keep(c, seen));
  };
  const branch = (parent: string | null, depth: number, seen: Set<string>): React.ReactNode => {
    const items = (children.get(parent) ?? []).filter((r) => !seen.has(r.id) && keep(r));
    if (items.length === 0) return null;
    return (
      <ul className={cn("flex flex-col gap-1", depth > 0 && "ml-4 border-l border-border pl-4")}>
        {items.map((r) => {
          const next = new Set(seen).add(r.id);
          return (
            <li key={r.id} className="flex flex-col gap-1">
              <div className={cn("flex flex-wrap items-center gap-2 rounded-md p-2 text-sm", visible.has(r.id) ? "bg-card" : "opacity-60")}>
                <Link href={`/alliances/${r.id}`} className="font-medium text-foreground underline">
                  {r.organizationName}
                </Link>
                {r.organizationType && <span className="text-muted-foreground">{tType(r.organizationType)}</span>}
                {statusBadge(r.status)}
                {convert(r)}
              </div>
              {branch(r.id, depth + 1, next)}
            </li>
          );
        })}
      </ul>
    );
  };
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <p className="font-heading text-base text-foreground">{t("ams")}</p>
      {branch(null, 1, new Set())}
    </div>
  );
}

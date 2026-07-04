"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpDown, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClientStatusBadge } from "./StatusBadge";
import type { Client } from "@/lib/db/schema";
import { clientStatusValues } from "@/lib/validation/client";

type SortKey = "name" | "added";

export function ClientTable({ clients }: { clients: Client[] }) {
  const t = useTranslations("Clients");
  const tStatus = useTranslations("ClientStatus");
  const tService = useTranslations("ServiceType");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("added");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let rows = clients.filter((client) => {
      if (statusFilter !== "all" && client.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        client.fullName.toLowerCase().includes(q) ||
        (client.email ?? "").toLowerCase().includes(q) ||
        (client.phone ?? "").toLowerCase().includes(q)
      );
    });

    rows = rows.slice().sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === "name") {
        return a.fullName.localeCompare(b.fullName) * dir;
      }
      return (
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
        dir
      );
    });

    return rows;
  }, [clients, query, statusFilter, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("columnStatus")}</SelectItem>
            {clientStatusValues.map((status) => (
              <SelectItem key={status} value={status}>
                {tStatus(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {clients.length === 0 ? t("empty") : t("noResults")}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort("name")}
                    className="inline-flex items-center gap-1 font-medium"
                  >
                    {t("columnName")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>{t("columnContact")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
                <TableHead>{t("columnServices")}</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort("added")}
                    className="inline-flex items-center gap-1 font-medium"
                  >
                    {t("columnAdded")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {client.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-col">
                      <span>{client.email ?? "—"}</span>
                      <span className="text-xs">{client.phone ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ClientStatusBadge status={client.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(client.interestedServices ?? []).length === 0 && (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {(client.interestedServices ?? [])
                        .slice(0, 2)
                        .map((service) => (
                          <Badge key={service} variant="outline">
                            {tService(service)}
                          </Badge>
                        ))}
                      {(client.interestedServices ?? []).length > 2 && (
                        <Badge variant="outline">
                          +{(client.interestedServices ?? []).length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

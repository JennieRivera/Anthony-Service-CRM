"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CaseStatusBadge } from "@/components/clients/StatusBadge";
import type { CaseCardData } from "./CaseKanbanBoard";

export function CaseList({ cases }: { cases: CaseCardData[] }) {
  const t = useTranslations("Cases");
  const tService = useTranslations("ServiceType");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnTitle")}</TableHead>
            <TableHead>{t("columnClient")}</TableHead>
            <TableHead>{t("columnService")}</TableHead>
            <TableHead>{t("form.status")}</TableHead>
            <TableHead>{t("columnDue")}</TableHead>
            <TableHead>{t("columnFee")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <Link
                  href={`/cases/${c.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {c.title}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {c.clientName}
              </TableCell>
              <TableCell>{tService(c.serviceType)}</TableCell>
              <TableCell>
                <CaseStatusBadge status={c.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {c.dueDate ? new Date(c.dueDate).toLocaleDateString() : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {c.fee ? `$${Number(c.fee).toFixed(2)}` : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

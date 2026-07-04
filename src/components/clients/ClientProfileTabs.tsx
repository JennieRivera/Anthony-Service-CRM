"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CaseStatusBadge } from "./StatusBadge";
import type { Case, Invoice, Appointment } from "@/lib/db/schema";

function formatMoney(value: string | null) {
  if (!value) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

export function ClientProfileTabs({
  clientId,
  cases,
  invoices,
  appointments,
}: {
  clientId: string;
  cases: Case[];
  invoices: Invoice[];
  appointments: Appointment[];
}) {
  const t = useTranslations("Clients");
  const tCases = useTranslations("Cases");
  const tService = useTranslations("ServiceType");

  return (
    <Tabs defaultValue="cases">
      <TabsList>
        <TabsTrigger value="cases">
          {t("tabCases")} ({cases.length})
        </TabsTrigger>
        <TabsTrigger value="invoices">
          {t("tabInvoices")} ({invoices.length})
        </TabsTrigger>
        <TabsTrigger value="appointments">
          {t("tabAppointments")} ({appointments.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="cases" className="flex flex-col gap-2 pt-4">
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/cases/new?clientId=${clientId}`} />}
          >
            <Plus className="h-4 w-4" />
            {tCases("newCase")}
          </Button>
        </div>
        {cases.length === 0 && (
          <p className="text-muted-foreground">{t("noCases")}</p>
        )}
        {cases.map((c) => (
          <Link
            key={c.id}
            href={`/cases/${c.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">{c.title}</span>
              <span className="text-sm text-muted-foreground">
                {tService(c.serviceType)}
              </span>
            </div>
            <CaseStatusBadge status={c.status} />
          </Link>
        ))}
      </TabsContent>

      <TabsContent value="invoices" className="flex flex-col gap-2 pt-4">
        {invoices.length === 0 && (
          <p className="text-muted-foreground">{t("noInvoices")}</p>
        )}
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">
                INV-{String(invoice.invoiceSeq).padStart(5, "0")}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(invoice.issueDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-foreground">
                {formatMoney(invoice.total)}
              </span>
              <Badge variant="outline">{invoice.status}</Badge>
            </div>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="appointments" className="flex flex-col gap-2 pt-4">
        {appointments.length === 0 && (
          <p className="text-muted-foreground">{t("noAppointments")}</p>
        )}
        {appointments.map((appt) => (
          <div
            key={appt.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">
                {appt.title}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(appt.startAt).toLocaleString()}
              </span>
            </div>
            <Badge variant="outline">{appt.status}</Badge>
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}

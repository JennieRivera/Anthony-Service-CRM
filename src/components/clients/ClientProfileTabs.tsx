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
import { DocumentList } from "@/components/documents/DocumentList";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { ConversationTimeline } from "./ConversationTimeline";
import { LogConversationDialog } from "./LogConversationDialog";
import { CommunicationPreferencesPanel } from "./CommunicationPreferencesPanel";
import { HighLevelSyncPanel } from "./HighLevelSyncPanel";
import { ReferralStatusBadge } from "@/components/referrals/ReferralStatusBadge";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import type {
  Case,
  Invoice,
  Appointment,
  Document,
  ConversationMessage,
  Referral,
  Task,
  Payment,
  ClientCommunicationPreferences,
  ClientHighlevelSync,
} from "@/lib/db/schema";
import type { TimelineEntry } from "@/lib/queries/clients";
import type { getHighLevelSyncPreview } from "@/lib/queries/highlevel";

function formatMoney(value: string | null) {
  if (!value) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

const timelineIcon: Record<TimelineEntry["type"], string> = {
  case: "📁",
  invoice: "🧾",
  payment: "💳",
  appointment: "📅",
  conversation: "💬",
  document: "📄",
  referral: "🤝",
  task: "✅",
};

export function ClientProfileTabs({
  clientId,
  cases,
  invoices,
  appointments,
  documents,
  conversations,
  referrals,
  tasks,
  payments,
  timeline,
  blobConfigured,
  communicationPreferences,
  highlevelSync,
  highlevelPreview,
}: {
  clientId: string;
  cases: Case[];
  invoices: Invoice[];
  appointments: Appointment[];
  documents: Document[];
  conversations: ConversationMessage[];
  referrals: Referral[];
  tasks: Task[];
  payments: Payment[];
  timeline: TimelineEntry[];
  blobConfigured: boolean;
  communicationPreferences: ClientCommunicationPreferences | null;
  highlevelSync: ClientHighlevelSync | null;
  highlevelPreview: Awaited<ReturnType<typeof getHighLevelSyncPreview>>;
}) {
  const t = useTranslations("Clients");
  const tCases = useTranslations("Cases");
  const tDocuments = useTranslations("Documents");
  const tAppointments = useTranslations("Appointments");
  const tInvoices = useTranslations("Invoices");
  const tService = useTranslations("ServiceType");
  const tReferrals = useTranslations("Referrals");
  const tTaskType = useTranslations("TaskType");

  return (
    <Tabs defaultValue="timeline">
      <TabsList>
        <TabsTrigger value="timeline">{t("tabTimeline")}</TabsTrigger>
        <TabsTrigger value="conversations">
          {t("tabConversations")} ({conversations.length})
        </TabsTrigger>
        <TabsTrigger value="cases">
          {t("tabCases")} ({cases.length})
        </TabsTrigger>
        <TabsTrigger value="invoices">
          {t("tabInvoices")} ({invoices.length})
        </TabsTrigger>
        <TabsTrigger value="payments">
          {t("tabPayments")} ({payments.length})
        </TabsTrigger>
        <TabsTrigger value="referrals">
          {t("tabReferrals")} ({referrals.length})
        </TabsTrigger>
        <TabsTrigger value="appointments">
          {t("tabAppointments")} ({appointments.length})
        </TabsTrigger>
        <TabsTrigger value="tasks">
          {t("tabTasks")} ({tasks.length})
        </TabsTrigger>
        <TabsTrigger value="documents">
          {tDocuments("title")} ({documents.length})
        </TabsTrigger>
        <TabsTrigger value="preferences">
          {t("tabPreferences")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="timeline" className="flex flex-col gap-2 pt-4">
        {timeline.length === 0 && (
          <p className="text-muted-foreground">{t("noActivity")}</p>
        )}
        {timeline.map((entry, index) => {
          const row = (
            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                <span aria-hidden>{timelineIcon[entry.type]}</span>
                <span className="text-sm text-foreground">{entry.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.date).toLocaleString()}
              </span>
            </div>
          );
          return entry.href ? (
            <Link
              key={`${entry.type}-${index}`}
              href={entry.href}
              className="transition-opacity hover:opacity-80"
            >
              {row}
            </Link>
          ) : (
            <div key={`${entry.type}-${index}`}>{row}</div>
          );
        })}
      </TabsContent>

      <TabsContent
        value="conversations"
        className="flex flex-col gap-2 pt-4"
      >
        <div className="flex justify-end">
          <LogConversationDialog clientId={clientId} />
        </div>
        <ConversationTimeline conversations={conversations} cases={cases} />
      </TabsContent>

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
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/invoices/new?clientId=${clientId}`} />}
          >
            <Plus className="h-4 w-4" />
            {tInvoices("newInvoice")}
          </Button>
        </div>
        {invoices.length === 0 && (
          <p className="text-muted-foreground">{t("noInvoices")}</p>
        )}
        {invoices.map((invoice) => (
          <Link
            key={invoice.id}
            href={`/invoices/${invoice.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
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
          </Link>
        ))}
      </TabsContent>

      <TabsContent value="payments" className="flex flex-col gap-2 pt-4">
        {payments.length === 0 && (
          <p className="text-muted-foreground">{t("noPayments")}</p>
        )}
        {payments.map((payment) => (
          <Link
            key={payment.id}
            href={`/payments/${payment.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">
                {formatMoney(payment.amountPaid)} {t("of")}{" "}
                {formatMoney(payment.amountTotal)}
              </span>
              <span className="text-sm text-muted-foreground">
                {payment.paymentDate
                  ? new Date(payment.paymentDate).toLocaleDateString()
                  : "—"}
              </span>
            </div>
            <PaymentStatusBadge status={payment.status} />
          </Link>
        ))}
      </TabsContent>

      <TabsContent value="referrals" className="flex flex-col gap-2 pt-4">
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/referrals/new?clientId=${clientId}`} />}
          >
            <Plus className="h-4 w-4" />
            {tReferrals("newReferral")}
          </Button>
        </div>
        {referrals.length === 0 && (
          <p className="text-muted-foreground">{t("noReferrals")}</p>
        )}
        {referrals.map((referral) => (
          <Link
            key={referral.id}
            href={`/referrals/${referral.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">
                REF-{String(referral.referralSeq).padStart(5, "0")}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(referral.referralDate).toLocaleDateString()}
              </span>
            </div>
            <ReferralStatusBadge status={referral.status} />
          </Link>
        ))}
      </TabsContent>

      <TabsContent value="appointments" className="flex flex-col gap-2 pt-4">
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/appointments/new?clientId=${clientId}`} />}
          >
            <Plus className="h-4 w-4" />
            {tAppointments("newAppointment")}
          </Button>
        </div>
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

      <TabsContent value="tasks" className="flex flex-col gap-2 pt-4">
        {tasks.length === 0 && (
          <p className="text-muted-foreground">{t("noTasks")}</p>
        )}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">
                {task.title}
              </span>
              <span className="text-sm text-muted-foreground">
                {tTaskType(task.type)}
                {task.dueDate
                  ? ` — ${new Date(task.dueDate).toLocaleDateString()}`
                  : ""}
              </span>
            </div>
            <Badge variant="outline">{task.status}</Badge>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="documents" className="flex flex-col gap-4 pt-4">
        {blobConfigured ? (
          <DocumentUploader clientId={clientId} />
        ) : (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {tDocuments("notConfigured")}
          </p>
        )}
        <DocumentList documents={documents} />
      </TabsContent>

      <TabsContent value="preferences" className="flex flex-col gap-4 pt-4">
        <CommunicationPreferencesPanel
          clientId={clientId}
          preferences={communicationPreferences}
        />
        <HighLevelSyncPanel
          clientId={clientId}
          sync={highlevelSync}
          preview={highlevelPreview}
        />
      </TabsContent>
    </Tabs>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CaseStatusBadge } from "@/components/clients/StatusBadge";
import { ReferralStatusBadge } from "@/components/referrals/ReferralStatusBadge";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { DocumentList } from "@/components/documents/DocumentList";
import { CompanyDocumentChecklist } from "./CompanyDocumentChecklist";
import { CompanyComplianceDashboard } from "./CompanyComplianceDashboard";
import type {
  Case,
  Invoice,
  Appointment,
  Document,
  ConversationMessage,
  Referral,
  Task,
  Payment,
  CompanyDocumentChecklistItem,
} from "@/lib/db/schema";
import type { CompanyTimelineEntry } from "@/lib/queries/companies";
import type { CompanyComplianceSummary } from "@/lib/queries/companyCompliance";
import type {
  createCompanyChecklistItemAction,
  updateCompanyChecklistItemAction,
  deleteCompanyChecklistItemAction,
} from "@/app/[locale]/(app)/companies/actions";

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

const timelineIcon: Record<CompanyTimelineEntry["type"], string> = {
  case: "📁",
  invoice: "🧾",
  payment: "💳",
  appointment: "📅",
  conversation: "💬",
  document: "📄",
  referral: "🤝",
  task: "✅",
};

export function CompanyProfileTabs({
  companyId,
  profile,
  checklistItems,
  complianceSummary,
  cases,
  invoices,
  payments,
  appointments,
  tasks,
  conversations,
  referrals,
  documents,
  timeline,
  outstandingBalance,
  onCreateChecklistItem,
  onUpdateChecklistItemStatus,
  onDeleteChecklistItem,
}: {
  companyId: string;
  profile: React.ReactNode;
  checklistItems: CompanyDocumentChecklistItem[];
  complianceSummary: CompanyComplianceSummary;
  cases: Case[];
  invoices: Invoice[];
  payments: Payment[];
  appointments: Appointment[];
  tasks: Task[];
  conversations: ConversationMessage[];
  referrals: Referral[];
  documents: Document[];
  timeline: CompanyTimelineEntry[];
  outstandingBalance: number;
  onCreateChecklistItem: typeof createCompanyChecklistItemAction;
  onUpdateChecklistItemStatus: typeof updateCompanyChecklistItemAction;
  onDeleteChecklistItem: typeof deleteCompanyChecklistItemAction;
}) {
  const t = useTranslations("Companies.tabs");
  const tService = useTranslations("ServiceType");
  const tTaskType = useTranslations("TaskType");

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">{t("profile")}</TabsTrigger>
        <TabsTrigger value="checklist">
          {t("checklist")} ({checklistItems.length})
        </TabsTrigger>
        <TabsTrigger value="compliance">{t("compliance")}</TabsTrigger>
        <TabsTrigger value="timeline">{t("timeline")}</TabsTrigger>
        <TabsTrigger value="cases">
          {t("cases")} ({cases.length})
        </TabsTrigger>
        <TabsTrigger value="invoices">
          {t("invoices")} ({invoices.length})
        </TabsTrigger>
        <TabsTrigger value="payments">
          {t("payments")} ({payments.length})
        </TabsTrigger>
        <TabsTrigger value="appointments">
          {t("appointments")} ({appointments.length})
        </TabsTrigger>
        <TabsTrigger value="tasks">
          {t("tasks")} ({tasks.length})
        </TabsTrigger>
        <TabsTrigger value="communications">
          {t("communications")} ({conversations.length})
        </TabsTrigger>
        <TabsTrigger value="referrals">
          {t("referrals")} ({referrals.length})
        </TabsTrigger>
        <TabsTrigger value="documents">
          {t("documents")} ({documents.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="flex flex-col gap-6 pt-4">
        {profile}
      </TabsContent>

      <TabsContent value="checklist" className="pt-4">
        <CompanyDocumentChecklist
          companyId={companyId}
          items={checklistItems}
          onCreate={onCreateChecklistItem}
          onUpdateStatus={onUpdateChecklistItemStatus}
          onDelete={onDeleteChecklistItem}
        />
      </TabsContent>

      <TabsContent value="compliance" className="pt-4">
        <CompanyComplianceDashboard summary={complianceSummary} />
      </TabsContent>

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

      <TabsContent value="cases" className="flex flex-col gap-2 pt-4">
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
        {invoices.length > 0 && (
          <p className="pt-1 text-sm text-muted-foreground">
            {t("outstandingBalance")}: {formatMoney(outstandingBalance)}
          </p>
        )}
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
                {formatMoney(payment.amountPaid)} / {formatMoney(payment.amountTotal)}
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
              <span className="font-medium text-foreground">{appt.title}</span>
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
              <span className="font-medium text-foreground">{task.title}</span>
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

      <TabsContent value="communications" className="flex flex-col gap-2 pt-4">
        {conversations.length === 0 && (
          <p className="text-muted-foreground">{t("noCommunications")}</p>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">
                {conv.subject || conv.summary.slice(0, 80)}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(conv.occurredAt).toLocaleString()}
              </span>
            </div>
            <Badge variant="outline">{conv.channel}</Badge>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="referrals" className="flex flex-col gap-2 pt-4">
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

      <TabsContent value="documents" className="pt-4">
        <DocumentList documents={documents} />
      </TabsContent>
    </Tabs>
  );
}

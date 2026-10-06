import { and, desc, eq, inArray } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import {
  appointments,
  caseStatusHistory,
  cases,
  clients,
  companies,
  conversationMessages,
  documents,
  invoices,
  payments,
  tasks,
} from "@/lib/db/schema";
import { money, text, usDate, usDateTime, type ExportSection } from "./document";
import type { ExportT } from "./translator";

// "Export" on a record (client, case, appointment, company): everything on
// that record in one PDF/Word file. Same rules as lists.ts — explicit safe
// columns only (service-specific extension tables such as immigration
// details are never read here), document NAMES only (never contents or
// links), free text masked.

export const EXPORT_RECORDS = ["client", "case", "appointment", "company"] as const;
export type ExportRecord = (typeof EXPORT_RECORDS)[number];

export type RecordExport = { title: string; subtitle?: string; sections: ExportSection[] };

const MAX_TIMELINE = 200;
const invoiceNumber = (seq: number | null | undefined) => (seq == null ? "" : `INV-${String(seq).padStart(5, "0")}`);

type TimelineItem = { at: Date; kind: string; detail: string };

function timelineSection(tr: ExportT, items: TimelineItem[]): ExportSection {
  const c = (key: string) => tr.t(`Export.columns.${key}`);
  const sorted = items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, MAX_TIMELINE);
  return {
    heading: tr.t("Export.sections.timeline"),
    table: { columns: [c("date"), c("type"), c("detail")], rows: sorted.map((i) => [usDateTime(i.at), i.kind, i.detail]) },
    empty: tr.t("Export.none"),
  };
}

async function sectionsForClientScope(
  tr: ExportT,
  scope: { clientId: string; caseId?: string },
): Promise<{ sections: ExportSection[]; timeline: TimelineItem[] }> {
  const { t, label, title } = tr;
  const c = (key: string) => t(`Export.columns.${key}`);
  const db = getDb();
  // A case export covers that case's records; a client export, all of
  // the client's.
  const byScope = (table: { clientId: AnyPgColumn; caseId: AnyPgColumn }) =>
    scope.caseId ? eq(table.caseId, scope.caseId) : eq(table.clientId, scope.clientId);

  const [caseRows, apptRows, taskRows, docRows, invoiceRows, convRows] = await Promise.all([
    scope.caseId
      ? Promise.resolve([])
      : db.select().from(cases).where(eq(cases.clientId, scope.clientId)).orderBy(desc(cases.createdAt)),
    db.select().from(appointments).where(byScope(appointments)).orderBy(desc(appointments.startAt)),
    db
      .select()
      .from(tasks)
      .where(and(byScope(tasks), eq(tasks.status, "open")))
      .orderBy(tasks.dueDate),
    db
      .select({
        id: documents.id,
        createdAt: documents.createdAt,
        fileName: documents.fileName,
        category: documents.category,
        status: documents.status,
      })
      .from(documents)
      .where(byScope(documents))
      .orderBy(desc(documents.createdAt)),
    db.select().from(invoices).where(byScope(invoices)).orderBy(desc(invoices.createdAt)),
    db
      .select({
        occurredAt: conversationMessages.occurredAt,
        channel: conversationMessages.channel,
        subject: conversationMessages.subject,
        summary: conversationMessages.summary,
      })
      .from(conversationMessages)
      .where(byScope(conversationMessages))
      .orderBy(desc(conversationMessages.occurredAt)),
  ]);
  const paymentRows = invoiceRows.length
    ? await db
        .select()
        .from(payments)
        .where(inArray(payments.invoiceId, invoiceRows.map((i) => i.id)))
        .orderBy(desc(payments.createdAt))
    : [];
  const seqByInvoice = new Map(invoiceRows.map((i) => [i.id, i.invoiceSeq]));

  const sections: ExportSection[] = [];
  if (!scope.caseId) {
    sections.push({
      heading: t("Export.sections.cases"),
      table: {
        columns: [c("case"), c("service"), c("status"), c("start"), c("due"), c("fee")],
        rows: caseRows.map((r) => [text(r.title), label("ServiceType", r.serviceType), label("CaseStatus", r.status), usDate(r.startDate), usDate(r.dueDate), money(r.fee)]),
      },
      empty: t("Export.none"),
    });
  }
  sections.push(
    {
      heading: t("Export.sections.appointments"),
      table: {
        columns: [c("start"), c("appointment"), c("service"), c("status")],
        rows: apptRows.map((r) => [usDateTime(r.startAt), title(text(r.title)), label("ServiceType", r.serviceType), label("AppointmentStatus", r.status)]),
      },
      empty: t("Export.none"),
    },
    {
      heading: t("Export.sections.openTasks"),
      table: {
        columns: [c("type"), c("task"), c("due")],
        rows: taskRows.map((r) => [label("TaskType", r.type), title(text(r.title)), usDate(r.dueDate)]),
      },
      empty: t("Export.none"),
    },
    {
      heading: t("Export.sections.documents"),
      table: {
        columns: [c("file"), c("folder"), c("status"), c("added")],
        rows: docRows.map((r) => [text(r.fileName), label("DocumentCategory", r.category), label("DocumentStatus", r.status), usDate(r.createdAt)]),
      },
      empty: t("Export.none"),
    },
    {
      heading: t("Export.sections.invoices"),
      table: {
        columns: [c("invoice"), c("status"), c("issued"), c("due"), c("total")],
        rows: invoiceRows.map((r) => [invoiceNumber(r.invoiceSeq), label("InvoiceStatus", r.status), usDate(r.issueDate), usDate(r.dueDate), money(r.total)]),
      },
      empty: t("Export.none"),
    },
    {
      heading: t("Export.sections.payments"),
      table: {
        columns: [c("invoice"), c("total"), c("amountPaid"), c("balance"), c("status"), c("paymentDate")],
        rows: paymentRows.map((r) => [
          invoiceNumber(seqByInvoice.get(r.invoiceId)),
          money(r.amountTotal),
          money(r.amountPaid),
          money(r.balanceDue),
          label("PaymentStatus", r.status),
          usDate(r.paymentDate),
        ]),
      },
      empty: t("Export.none"),
    },
  );

  const kind = (key: string) => t(`Export.timeline.${key}`);
  const timeline: TimelineItem[] = [
    ...caseRows.map((r) => ({ at: r.createdAt, kind: kind("case"), detail: text(r.title) })),
    ...apptRows.map((r) => ({ at: r.startAt, kind: kind("appointment"), detail: `${title(text(r.title))} — ${label("AppointmentStatus", r.status)}` })),
    ...convRows.map((r) => ({ at: r.occurredAt, kind: label("ConversationChannel", r.channel), detail: text(r.subject || r.summary) })),
    ...docRows.map((r) => ({ at: r.createdAt, kind: kind("document"), detail: text(r.fileName) })),
    ...invoiceRows.map((r) => ({ at: r.createdAt, kind: kind("invoice"), detail: `${invoiceNumber(r.invoiceSeq)} — ${money(r.total)}` })),
    ...paymentRows.map((r) => ({ at: r.createdAt, kind: kind("payment"), detail: `${money(r.amountPaid)} — ${label("PaymentStatus", r.status)}` })),
    ...taskRows.map((r) => ({ at: r.createdAt, kind: kind("task"), detail: title(text(r.title)) })),
  ];
  return { sections, timeline };
}

export async function buildRecordExport(type: ExportRecord, id: string, tr: ExportT): Promise<RecordExport | null> {
  const { t, label, title } = tr;
  const f = (key: string) => t(`Export.columns.${key}`);
  const db = getDb();

  switch (type) {
    case "client": {
      const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
      if (!client) return null;
      const scoped = await sectionsForClientScope(tr, { clientId: id });
      return {
        title: client.fullName,
        subtitle: t("Export.records.client"),
        sections: [
          {
            heading: t("Export.sections.contact"),
            fields: [
              [f("name"), client.fullName],
              [f("phone"), client.phone ?? ""],
              [f("email"), client.email ?? ""],
              [f("language"), client.preferredLanguage === "en" ? "English" : "Español"],
              [f("status"), label("ClientStatus", client.status)],
              [f("address"), text(client.address)],
              [f("bestTime"), client.bestTimeToCall ? t(`Clients.bestTimes.${client.bestTimeToCall}`) : ""],
              [f("services"), (client.interestedServices ?? []).map((s) => label("ServiceType", s)).join("; ")],
              [f("referralSource"), text(client.referralSource)],
              [f("folder"), client.folderNumber ?? ""],
              [f("added"), usDate(client.createdAt)],
              [f("notes"), text(client.notes)],
            ],
          },
          ...scoped.sections,
          timelineSection(tr, scoped.timeline),
        ],
      };
    }
    case "case": {
      const [row] = await db
        .select({ c: cases, clientName: clients.fullName })
        .from(cases)
        .innerJoin(clients, eq(cases.clientId, clients.id))
        .where(eq(cases.id, id))
        .limit(1);
      if (!row) return null;
      const k = row.c;
      const [scoped, history] = await Promise.all([
        sectionsForClientScope(tr, { clientId: k.clientId, caseId: id }),
        db.select().from(caseStatusHistory).where(eq(caseStatusHistory.caseId, id)),
      ]);
      const timeline = [
        ...scoped.timeline,
        ...history.map((h) => ({
          at: h.changedAt,
          kind: t("Export.timeline.status"),
          detail: `${h.previousStatus ? `${label("CaseStatus", h.previousStatus)} → ` : ""}${label("CaseStatus", h.newStatus)}${h.note ? ` — ${text(h.note)}` : ""}`,
        })),
      ];
      return {
        title: text(k.title),
        subtitle: `${t("Export.records.case")} · ${row.clientName}`,
        sections: [
          {
            heading: t("Export.sections.caseData"),
            fields: [
              [f("client"), row.clientName],
              [f("service"), label("ServiceType", k.serviceType)],
              [f("status"), label("CaseStatus", k.status)],
              [f("start"), usDate(k.startDate)],
              [f("due"), usDate(k.dueDate)],
              [f("nextFollowUp"), usDate(k.nextFollowUpDate)],
              [f("nextAction"), text(k.nextAction)],
              [f("fee"), money(k.fee)],
              [f("paymentStatus"), label("PaymentStatus", k.paymentStatus)],
              [f("closed"), usDate(k.closedDate)],
              [f("notes"), text(k.notes)],
            ],
          },
          ...scoped.sections,
          timelineSection(tr, timeline),
        ],
      };
    }
    case "appointment": {
      const [row] = await db
        .select({ a: appointments, clientName: clients.fullName, caseTitle: cases.title })
        .from(appointments)
        .innerJoin(clients, eq(appointments.clientId, clients.id))
        .leftJoin(cases, eq(appointments.caseId, cases.id))
        .where(eq(appointments.id, id))
        .limit(1);
      if (!row) return null;
      const a = row.a;
      const openTasks = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.appointmentId, id), eq(tasks.status, "open")));
      return {
        title: title(text(a.title)),
        subtitle: `${t("Export.records.appointment")} · ${row.clientName}`,
        sections: [
          {
            heading: t("Export.sections.appointmentData"),
            fields: [
              [f("client"), row.clientName],
              [f("case"), text(row.caseTitle)],
              [f("service"), label("ServiceType", a.serviceType)],
              [f("type"), label("AppointmentType", a.appointmentType)],
              [f("status"), label("AppointmentStatus", a.status)],
              [f("start"), usDateTime(a.startAt)],
              [f("end"), usDateTime(a.endAt)],
              [f("location"), text(a.location)],
              [f("paymentStatus"), label("PaymentStatus", a.paymentStatus)],
              [f("notes"), text(a.notes)],
            ],
          },
          {
            heading: t("Export.sections.openTasks"),
            table: {
              columns: [f("type"), f("task"), f("due")],
              rows: openTasks.map((r) => [label("TaskType", r.type), title(text(r.title)), usDate(r.dueDate)]),
            },
            empty: t("Export.none"),
          },
        ],
      };
    }
    case "company": {
      const [co] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
      if (!co) return null;
      const people = await db
        .select({ fullName: clients.fullName, phone: clients.phone, email: clients.email })
        .from(clients)
        .where(eq(clients.companyId, id))
        .orderBy(clients.fullName);
      // Deliberately left out: state document number, banking and credit
      // details, and every other financial field.
      return {
        title: co.legalBusinessName,
        subtitle: t("Export.records.company"),
        sections: [
          {
            heading: t("Export.sections.companyData"),
            fields: [
              [f("legalName"), co.legalBusinessName],
              [f("dba"), co.dbaName ?? ""],
              [f("entityType"), label("CompanyEntityType", co.entityType)],
              [f("state"), co.stateOfFormation ?? ""],
              [f("formed"), usDate(co.formationDate)],
              [f("phone"), co.phone ?? ""],
              [f("email"), co.email ?? ""],
              [f("website"), co.website ?? ""],
              [f("industry"), text(co.industry)],
              [f("address"), text(co.principalBusinessAddress)],
              [f("mailingAddress"), text(co.mailingAddress)],
              [f("notes"), text(co.notes)],
            ],
          },
          {
            heading: t("Export.sections.companyClients"),
            table: {
              columns: [f("name"), f("phone"), f("email")],
              rows: people.map((p) => [p.fullName, p.phone ?? "", p.email ?? ""]),
            },
            empty: t("Export.none"),
          },
        ],
      };
    }
  }
}

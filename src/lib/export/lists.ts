import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  appointments,
  cases,
  clients,
  companies,
  conversationMessages,
  invoices,
  payments,
  tasks,
} from "@/lib/db/schema";
import { landscapeFor, money, text, usDate, usDateTime, type ExportTable } from "./document";
import type { ExportT } from "./translator";

// "Export" on a list exports exactly the rows the person is looking at:
// the page sends the visible ids in display order (after its own filters,
// search and sorting), and the server re-reads those rows itself — never
// trusting anything else the browser sent. Only the columns below ever
// leave the database: no SSN/ITIN, A-numbers, immigration receipt
// numbers, payment confirmations or document contents, and free text is
// masked (see mask.ts).

export const EXPORT_LISTS = [
  "clients",
  "cases",
  "appointments",
  "companies",
  "invoices",
  "payments",
  "tasks",
  "communications",
] as const;
export type ExportList = (typeof EXPORT_LISTS)[number];

export const MAX_EXPORT_ROWS = 5000;

function inOrder<T extends { id: string }>(ids: string[], rows: T[]): T[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is T => r !== undefined);
}

const invoiceNumber = (seq: number | null | undefined) => (seq == null ? "" : `INV-${String(seq).padStart(5, "0")}`);

export async function buildListTable(list: ExportList, ids: string[], tr: ExportT): Promise<ExportTable> {
  const { t, label, title } = tr;
  const c = (key: string) => t(`Export.columns.${key}`);
  const db = getDb();

  switch (list) {
    case "clients": {
      const rows = inOrder(ids, await db.select().from(clients).where(inArray(clients.id, ids)));
      return {
        columns: [c("name"), c("phone"), c("email"), c("language"), c("status"), c("address"), c("services"), c("referralSource"), c("folder"), c("added"), c("notes")],
        rows: rows.map((r) => [
          r.fullName,
          r.phone ?? "",
          r.email ?? "",
          r.preferredLanguage === "en" ? "English" : "Español",
          label("ClientStatus", r.status),
          text(r.address),
          (r.interestedServices ?? []).map((s) => label("ServiceType", s)).join("; "),
          text(r.referralSource),
          r.folderNumber ?? "",
          usDate(r.createdAt),
          text(r.notes),
        ]),
      };
    }
    case "cases": {
      const rows = inOrder(
        ids,
        await db
          .select({
            id: cases.id,
            title: cases.title,
            clientName: clients.fullName,
            serviceType: cases.serviceType,
            status: cases.status,
            startDate: cases.startDate,
            dueDate: cases.dueDate,
            nextFollowUpDate: cases.nextFollowUpDate,
            fee: cases.fee,
            paymentStatus: cases.paymentStatus,
            closedDate: cases.closedDate,
          })
          .from(cases)
          .innerJoin(clients, eq(cases.clientId, clients.id))
          .where(inArray(cases.id, ids)),
      );
      return {
        columns: [c("case"), c("client"), c("service"), c("status"), c("start"), c("due"), c("nextFollowUp"), c("fee"), c("paymentStatus"), c("closed")],
        rows: rows.map((r) => [
          text(r.title),
          r.clientName,
          label("ServiceType", r.serviceType),
          label("CaseStatus", r.status),
          usDate(r.startDate),
          usDate(r.dueDate),
          usDate(r.nextFollowUpDate),
          money(r.fee),
          label("PaymentStatus", r.paymentStatus),
          usDate(r.closedDate),
        ]),
      };
    }
    case "appointments": {
      const rows = inOrder(
        ids,
        await db
          .select({
            id: appointments.id,
            startAt: appointments.startAt,
            endAt: appointments.endAt,
            title: appointments.title,
            clientName: clients.fullName,
            serviceType: appointments.serviceType,
            appointmentType: appointments.appointmentType,
            status: appointments.status,
            location: appointments.location,
            paymentStatus: appointments.paymentStatus,
          })
          .from(appointments)
          .innerJoin(clients, eq(appointments.clientId, clients.id))
          .where(inArray(appointments.id, ids)),
      );
      return {
        columns: [c("start"), c("end"), c("appointment"), c("client"), c("service"), c("type"), c("status"), c("location"), c("paymentStatus")],
        rows: rows.map((r) => [
          usDateTime(r.startAt),
          usDateTime(r.endAt),
          title(text(r.title)),
          r.clientName,
          label("ServiceType", r.serviceType),
          label("AppointmentType", r.appointmentType),
          label("AppointmentStatus", r.status),
          text(r.location),
          label("PaymentStatus", r.paymentStatus),
        ]),
      };
    }
    case "companies": {
      const rows = inOrder(
        ids,
        await db
          .select({
            id: companies.id,
            legalBusinessName: companies.legalBusinessName,
            dbaName: companies.dbaName,
            entityType: companies.entityType,
            stateOfFormation: companies.stateOfFormation,
            formationDate: companies.formationDate,
            phone: companies.phone,
            email: companies.email,
            industry: companies.industry,
            principalBusinessAddress: companies.principalBusinessAddress,
          })
          .from(companies)
          .where(inArray(companies.id, ids)),
      );
      return {
        columns: [c("legalName"), c("dba"), c("entityType"), c("state"), c("formed"), c("phone"), c("email"), c("industry"), c("address")],
        rows: rows.map((r) => [
          r.legalBusinessName,
          r.dbaName ?? "",
          label("CompanyEntityType", r.entityType),
          r.stateOfFormation ?? "",
          usDate(r.formationDate),
          r.phone ?? "",
          r.email ?? "",
          text(r.industry),
          text(r.principalBusinessAddress),
        ]),
      };
    }
    case "invoices": {
      const rows = inOrder(
        ids,
        await db
          .select({
            id: invoices.id,
            invoiceSeq: invoices.invoiceSeq,
            clientName: clients.fullName,
            caseTitle: cases.title,
            status: invoices.status,
            issueDate: invoices.issueDate,
            dueDate: invoices.dueDate,
            subtotal: invoices.subtotal,
            taxAmount: invoices.taxAmount,
            total: invoices.total,
            paidAt: invoices.paidAt,
            paymentMethod: invoices.paymentMethod,
          })
          .from(invoices)
          .innerJoin(clients, eq(invoices.clientId, clients.id))
          .leftJoin(cases, eq(invoices.caseId, cases.id))
          .where(inArray(invoices.id, ids)),
      );
      return {
        columns: [c("invoice"), c("client"), c("case"), c("status"), c("issued"), c("due"), c("subtotal"), c("tax"), c("total"), c("paid"), c("method")],
        rows: rows.map((r) => [
          invoiceNumber(r.invoiceSeq),
          r.clientName,
          text(r.caseTitle),
          label("InvoiceStatus", r.status),
          usDate(r.issueDate),
          usDate(r.dueDate),
          money(r.subtotal),
          money(r.taxAmount),
          money(r.total),
          usDate(r.paidAt),
          text(r.paymentMethod),
        ]),
      };
    }
    case "payments": {
      // transaction_confirmation is never exported (it can hold card or
      // account digits); the receipt number is masked like free text.
      const rows = inOrder(
        ids,
        await db
          .select({
            id: payments.id,
            invoiceSeq: invoices.invoiceSeq,
            clientName: clients.fullName,
            amountTotal: payments.amountTotal,
            depositAmount: payments.depositAmount,
            amountPaid: payments.amountPaid,
            balanceDue: payments.balanceDue,
            status: payments.status,
            paymentDate: payments.paymentDate,
            paymentMethod: payments.paymentMethod,
            receiptNumber: payments.receiptNumber,
            refundStatus: payments.refundStatus,
          })
          .from(payments)
          .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
          .innerJoin(clients, eq(invoices.clientId, clients.id))
          .where(inArray(payments.id, ids)),
      );
      return {
        columns: [c("client"), c("invoice"), c("total"), c("deposit"), c("amountPaid"), c("balance"), c("status"), c("paymentDate"), c("method"), c("receipt"), c("refund")],
        rows: rows.map((r) => [
          r.clientName,
          invoiceNumber(r.invoiceSeq),
          money(r.amountTotal),
          money(r.depositAmount),
          money(r.amountPaid),
          money(r.balanceDue),
          label("PaymentStatus", r.status),
          usDate(r.paymentDate),
          text(r.paymentMethod),
          text(r.receiptNumber),
          label("RefundStatus", r.refundStatus),
        ]),
      };
    }
    case "tasks": {
      const rows = inOrder(
        ids,
        await db
          .select({
            id: tasks.id,
            type: tasks.type,
            title: tasks.title,
            clientName: clients.fullName,
            caseTitle: cases.title,
            dueDate: tasks.dueDate,
            status: tasks.status,
            createdAt: tasks.createdAt,
          })
          .from(tasks)
          .innerJoin(clients, eq(tasks.clientId, clients.id))
          .leftJoin(cases, eq(tasks.caseId, cases.id))
          .where(inArray(tasks.id, ids)),
      );
      return {
        columns: [c("type"), c("task"), c("client"), c("case"), c("due"), c("created")],
        rows: rows.map((r) => [
          label("TaskType", r.type),
          title(text(r.title)),
          r.clientName,
          text(r.caseTitle),
          usDate(r.dueDate),
          usDate(r.createdAt),
        ]),
      };
    }
    case "communications": {
      const rows = inOrder(
        ids,
        await db
          .select({
            id: conversationMessages.id,
            seq: conversationMessages.communicationSeq,
            occurredAt: conversationMessages.occurredAt,
            clientName: clients.fullName,
            channel: conversationMessages.channel,
            direction: conversationMessages.direction,
            subject: conversationMessages.subject,
            summary: conversationMessages.summary,
            status: conversationMessages.status,
            followUpRequired: conversationMessages.followUpRequired,
            followUpDate: conversationMessages.followUpDate,
            createdByEmail: conversationMessages.createdByEmail,
          })
          .from(conversationMessages)
          .innerJoin(clients, eq(conversationMessages.clientId, clients.id))
          .where(inArray(conversationMessages.id, ids)),
      );
      return {
        columns: [c("id"), c("date"), c("client"), c("channel"), c("direction"), c("summary"), c("status"), c("followUp"), c("automatic")],
        rows: rows.map((r) => [
          `COM-${String(r.seq).padStart(5, "0")}`,
          usDateTime(r.occurredAt),
          r.clientName,
          label("ConversationChannel", r.channel),
          label("ConversationDirection", r.direction),
          text(r.subject || r.summary),
          label("CommunicationStatus", r.status),
          r.followUpRequired ? usDate(r.followUpDate) || t("Export.yes") : "",
          r.createdByEmail === "system:automatic-notices" ? t("Export.yes") : "",
        ]),
      };
    }
  }
}

export function listIsLandscape(table: ExportTable) {
  return landscapeFor(table.columns.length);
}

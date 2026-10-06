import { and, asc, desc, eq, gt, notInArray, or, sql } from "drizzle-orm";
import { appointments, cases, clients, documents, tasks } from "@/lib/db/schema";
import type { PortalDb } from "./db";
import {
  buildPortalChangeRequestTitle,
  buildPortalUploadTitle,
} from "@/lib/booking/titles";
import { PORTAL_MAX_UPLOADS_PER_DAY } from "./config";

// ALL client-portal data access. Rules, enforced in every function:
//   1. clientId always comes from the resolved portal session (never from
//      the URL or a form) and is ALWAYS part of the WHERE clause.
//   2. Only explicitly listed, client-safe columns are selected — never
//      notes, fees, payment data, staff fields or blob URLs (except the
//      one internal helper that streams a file).
//   3. Anything that isn't the client's own (or doesn't exist) comes back
//      as null/empty, so callers answer 404 — never 403.
// isolation.test.ts checks every function here against a second client.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value);

// ── client ────────────────────────────────────────────────────────────

export async function getPortalClient(db: PortalDb, clientId: string) {
  const [row] = await db
    .select({
      fullName: clients.fullName,
      preferredLanguage: clients.preferredLanguage,
      // Only whether a photo exists — never its blob URL.
      hasPhoto: sql<boolean>`${clients.photoBlobUrl} is not null`,
    })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  return row ?? null;
}

// Name/phone/email, only to prefill the public /book form server-side.
export async function getPortalBookingPrefill(db: PortalDb, clientId: string) {
  const [row] = await db
    .select({ fullName: clients.fullName, phone: clients.phone, email: clients.email })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  return row ? { fullName: row.fullName, phone: row.phone ?? "", email: row.email ?? "" } : null;
}

// ── cases ─────────────────────────────────────────────────────────────

const caseColumns = {
  id: cases.id,
  title: cases.title,
  serviceType: cases.serviceType,
  status: cases.status,
  // Free text written by staff — the case form marks both fields as
  // "Visible to the client in the portal".
  nextAction: cases.nextAction,
  documentsRequested: cases.documentsRequested,
  startDate: cases.startDate,
  updatedAt: cases.updatedAt,
};

export async function listPortalCases(db: PortalDb, clientId: string) {
  return db
    .select(caseColumns)
    .from(cases)
    .where(eq(cases.clientId, clientId))
    .orderBy(desc(cases.updatedAt));
}

export async function getPortalCase(db: PortalDb, clientId: string, caseId: unknown) {
  if (!isUuid(caseId)) return null;
  const [row] = await db
    .select(caseColumns)
    .from(cases)
    .where(and(eq(cases.id, caseId), eq(cases.clientId, clientId)))
    .limit(1);
  return row ?? null;
}

// ── appointments ──────────────────────────────────────────────────────

const appointmentColumns = {
  id: appointments.id,
  serviceType: appointments.serviceType,
  appointmentType: appointments.appointmentType,
  status: appointments.status,
  startAt: appointments.startAt,
  endAt: appointments.endAt,
};

// "rescheduled" rows are the superseded originals of a reschedule — the
// replacement appointment is what the client should see.
export async function listPortalAppointments(db: PortalDb, clientId: string) {
  return db
    .select(appointmentColumns)
    .from(appointments)
    .where(and(eq(appointments.clientId, clientId), notInArray(appointments.status, ["rescheduled"])))
    .orderBy(asc(appointments.startAt));
}

export async function getPortalAppointment(db: PortalDb, clientId: string, appointmentId: unknown) {
  if (!isUuid(appointmentId)) return null;
  const [row] = await db
    .select(appointmentColumns)
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.clientId, clientId),
        notInArray(appointments.status, ["rescheduled"]),
      ),
    )
    .limit(1);
  return row ?? null;
}

// ── documents ─────────────────────────────────────────────────────────

const visibleToThisClient = (clientId: string) =>
  and(
    eq(documents.clientId, clientId),
    or(eq(documents.uploadedByClient, true), eq(documents.visibleToClient, true)),
  );

const documentColumns = {
  id: documents.id,
  fileName: documents.fileName,
  createdAt: documents.createdAt,
  caseId: documents.caseId,
  uploadedByClient: documents.uploadedByClient,
};

export async function listPortalDocuments(
  db: PortalDb,
  clientId: string,
  options: { caseId?: string } = {},
) {
  return db
    .select(documentColumns)
    .from(documents)
    .where(
      options.caseId
        ? and(visibleToThisClient(clientId), eq(documents.caseId, options.caseId))
        : visibleToThisClient(clientId),
    )
    .orderBy(desc(documents.createdAt));
}

// Internal: the only function that returns a blob URL, used solely by the
// portal file route to stream the bytes server-side.
export async function getPortalDocumentFile(db: PortalDb, clientId: string, documentId: unknown) {
  if (!isUuid(documentId)) return null;
  const [row] = await db
    .select({ fileName: documents.fileName, blobUrl: documents.blobUrl })
    .from(documents)
    .where(and(eq(documents.id, documentId), visibleToThisClient(clientId)))
    .limit(1);
  return row ?? null;
}

// ── writes ────────────────────────────────────────────────────────────

export class PortalNotFoundError extends Error {}

export async function countClientUploadsSince(db: PortalDb, clientId: string, since: Date) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(documents)
    .where(
      and(
        eq(documents.clientId, clientId),
        eq(documents.uploadedByClient, true),
        gt(documents.createdAt, since),
      ),
    );
  return row?.n ?? 0;
}

export async function isClientUploadLimitReached(db: PortalDb, clientId: string, now = new Date()) {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return (await countClientUploadsSince(db, clientId, since)) >= PORTAL_MAX_UPLOADS_PER_DAY;
}

// Records a finished client upload: the document row (flagged "uploaded by
// client", visible to them) and a "review document" task for staff. The
// optional caseId must belong to the same client, or nothing is written.
export async function recordClientUpload(
  db: PortalDb,
  params: {
    clientId: string;
    caseId: string | null;
    fileName: string;
    blobUrl: string;
    sensitiveDataReason: string | null;
  },
): Promise<{ documentId: string }> {
  if (params.caseId !== null && !(await getPortalCase(db, params.clientId, params.caseId))) {
    throw new PortalNotFoundError("Case not found");
  }
  const [doc] = await db
    .insert(documents)
    .values({
      clientId: params.clientId,
      caseId: params.caseId,
      fileName: params.fileName,
      blobUrl: params.blobUrl,
      status: "received",
      category: "other",
      uploadedByClient: true,
      visibleToClient: true,
      sensitiveDataReason: params.sensitiveDataReason,
    })
    .returning({ id: documents.id });

  await db.insert(tasks).values({
    clientId: params.clientId,
    caseId: params.caseId,
    type: "document_review",
    title: buildPortalUploadTitle(params.fileName, params.sensitiveDataReason !== null),
    documentId: doc.id,
  });
  return { documentId: doc.id };
}

export type ChangeRequestResult = "created" | "already_requested";

// The portal never changes an appointment: it only creates a task for
// staff. One open request per appointment; the appointment must be the
// client's own, still upcoming, and not cancelled.
export async function requestAppointmentChange(
  db: PortalDb,
  params: {
    clientId: string;
    appointmentId: unknown;
    kind: "cancel" | "reschedule";
    message: string;
    now?: Date;
  },
): Promise<ChangeRequestResult> {
  const now = params.now ?? new Date();
  const appointment = await getPortalAppointment(db, params.clientId, params.appointmentId);
  if (
    !appointment ||
    appointment.startAt <= now ||
    ["cancelled", "completed", "no_show"].includes(appointment.status)
  ) {
    throw new PortalNotFoundError("Appointment not found");
  }

  const [open] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.appointmentId, appointment.id),
        eq(tasks.type, "appointment_change_request"),
        eq(tasks.status, "open"),
      ),
    )
    .limit(1);
  if (open) return "already_requested";

  await db.insert(tasks).values({
    clientId: params.clientId,
    appointmentId: appointment.id,
    type: "appointment_change_request",
    title: buildPortalChangeRequestTitle(params.kind, appointment.startAt, params.message),
  });
  return "created";
}


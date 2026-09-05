"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  cases,
  clients,
  notaryLogEntries,
  apostilleDetails,
  caseStatusEnum,
  caseStatusHistory,
  tasks,
  taskTypeEnum,
} from "@/lib/db/schema";
import {
  caseFormSchema,
  notaryServiceTypes,
  type CaseFormValues,
} from "@/lib/validation/case";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";

const CLOSED_STATUSES = ["completed", "cancelled"] as const;

function closedDateFor(status: (typeof caseStatusEnum.enumValues)[number]) {
  return (CLOSED_STATUSES as readonly string[]).includes(status)
    ? new Date().toISOString().slice(0, 10)
    : null;
}

async function recordStatusChange(
  caseId: string,
  previousStatus: (typeof caseStatusEnum.enumValues)[number] | null,
  newStatus: (typeof caseStatusEnum.enumValues)[number],
) {
  const session = await auth();
  await getDb()
    .insert(caseStatusHistory)
    .values({
      caseId,
      previousStatus,
      newStatus,
      changedByEmail: session?.user?.email ?? null,
    });
}

// Avoids spamming a duplicate task every time a case is re-saved while the
// same pending condition (unpaid, documents missing) still applies.
async function ensureOpenTask(
  clientId: string,
  caseId: string,
  type: (typeof taskTypeEnum.enumValues)[number],
  title: string,
  dueDate: string | null,
) {
  const db = getDb();
  const [existing] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.caseId, caseId),
        eq(tasks.type, type),
        eq(tasks.status, "open"),
      ),
    )
    .limit(1);

  if (!existing) {
    await db.insert(tasks).values({ clientId, caseId, type, title, dueDate });
  }
}

async function runAutomaticTasks(params: {
  caseId: string;
  clientId: string;
  title: string;
  isNewCase: boolean;
  justCompleted: boolean;
  paymentStatus: string | null;
  documentsRequested: string | null;
  documentsReceived: string | null;
  followUpDate: string | null;
}) {
  const {
    caseId,
    clientId,
    title,
    isNewCase,
    justCompleted,
    paymentStatus,
    documentsRequested,
    documentsReceived,
    followUpDate,
  } = params;
  const db = getDb();

  if (isNewCase) {
    await db.insert(tasks).values({
      clientId,
      caseId,
      type: "follow_up",
      title: `Follow up: ${title}`,
      dueDate: followUpDate,
    });
  }

  if (paymentStatus && !["paid", "refunded", "cancelled"].includes(paymentStatus)) {
    await ensureOpenTask(
      clientId,
      caseId,
      "payment_check",
      `Payment check: ${title}`,
      followUpDate,
    );
  }

  if (documentsRequested && !documentsReceived) {
    await ensureOpenTask(
      clientId,
      caseId,
      "document_reminder",
      `Documents pending: ${title}`,
      followUpDate,
    );
  }

  if (justCompleted) {
    await db.insert(tasks).values({
      clientId,
      caseId,
      type: "closing",
      title: `Close out: ${title}`,
    });
  }
}

async function upsertServiceDetails(
  caseId: string,
  clientId: string,
  values: CaseFormValues,
) {
  const db = getDb();

  if (notaryServiceTypes.includes(values.serviceType)) {
    if (
      values.notaryDocumentType &&
      values.notarialActType &&
      values.idVerificationMethod
    ) {
      const [client] = await db
        .select({ fullName: clients.fullName })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);

      await db.insert(notaryLogEntries).values({
        entryDate: new Date().toISOString().slice(0, 10),
        clientId,
        caseId,
        clientNameSnapshot: client?.fullName ?? "Unknown",
        documentType: values.notaryDocumentType,
        notarialActType: values.notarialActType,
        idVerificationMethod: values.idVerificationMethod,
        feeCharged: values.notaryFeeCharged || null,
      });
    }
    return;
  }

  if (values.serviceType === "document_prep") {
    if (values.destinationCountry && values.instrumentType) {
      await db
        .insert(apostilleDetails)
        .values({
          caseId,
          destinationCountry: values.destinationCountry,
          instrumentType: values.instrumentType,
          submissionDate: values.submissionDate || null,
          expectedReturnDate: values.expectedReturnDate || null,
          actualReturnDate: values.actualReturnDate || null,
        })
        .onConflictDoUpdate({
          target: apostilleDetails.caseId,
          set: {
            destinationCountry: values.destinationCountry,
            instrumentType: values.instrumentType,
            submissionDate: values.submissionDate || null,
            expectedReturnDate: values.expectedReturnDate || null,
            actualReturnDate: values.actualReturnDate || null,
          },
        });
    }
  }
}

export async function createCaseAction(rawValues: CaseFormValues) {
  const values = caseFormSchema.parse(rawValues);
  const db = getDb();

  const [created] = await db
    .insert(cases)
    .values({
      clientId: values.clientId,
      serviceType: values.serviceType,
      status: values.status,
      title: values.title,
      dueDate: values.dueDate || null,
      fee: values.fee || null,
      notes: values.notes || null,
      startDate: values.startDate,
      nextFollowUpDate: values.nextFollowUpDate || null,
      documentsRequested: values.documentsRequested || null,
      documentsReceived: values.documentsReceived || null,
      paymentStatus: values.paymentStatus || null,
      referralSource: values.referralSource || null,
      nextAction: values.nextAction || null,
      closedDate: closedDateFor(values.status),
    })
    .returning({ id: cases.id });

  await upsertServiceDetails(created.id, values.clientId, values);
  await recordStatusChange(created.id, null, values.status);
  await runAutomaticTasks({
    caseId: created.id,
    clientId: values.clientId,
    title: values.title,
    isNewCase: true,
    justCompleted: values.status === "completed",
    paymentStatus: values.paymentStatus || null,
    documentsRequested: values.documentsRequested || null,
    documentsReceived: values.documentsReceived || null,
    followUpDate: values.nextFollowUpDate || values.dueDate || null,
  });

  revalidatePath("/cases");
  revalidatePath(`/clients/${values.clientId}`);
  revalidatePath("/tasks");
  const locale = await getLocale();
  redirect({ href: `/cases/${created.id}`, locale });
}

export async function updateCaseAction(id: string, rawValues: CaseFormValues) {
  const values = caseFormSchema.parse(rawValues);
  const db = getDb();

  const [existing] = await db
    .select({ status: cases.status })
    .from(cases)
    .where(eq(cases.id, id))
    .limit(1);

  const statusChanged = Boolean(existing) && existing.status !== values.status;
  const justCompleted = statusChanged && values.status === "completed";

  await db
    .update(cases)
    .set({
      clientId: values.clientId,
      serviceType: values.serviceType,
      status: values.status,
      title: values.title,
      dueDate: values.dueDate || null,
      fee: values.fee || null,
      notes: values.notes || null,
      updatedAt: new Date(),
      startDate: values.startDate,
      nextFollowUpDate: values.nextFollowUpDate || null,
      documentsRequested: values.documentsRequested || null,
      documentsReceived: values.documentsReceived || null,
      paymentStatus: values.paymentStatus || null,
      referralSource: values.referralSource || null,
      nextAction: values.nextAction || null,
      closedDate: closedDateFor(values.status),
    })
    .where(eq(cases.id, id));

  await upsertServiceDetails(id, values.clientId, values);

  if (existing && statusChanged) {
    await recordStatusChange(id, existing.status, values.status);
  }

  await runAutomaticTasks({
    caseId: id,
    clientId: values.clientId,
    title: values.title,
    isNewCase: false,
    justCompleted,
    paymentStatus: values.paymentStatus || null,
    documentsRequested: values.documentsRequested || null,
    documentsReceived: values.documentsReceived || null,
    followUpDate: values.nextFollowUpDate || values.dueDate || null,
  });

  revalidatePath("/cases");
  revalidatePath(`/cases/${id}`);
  revalidatePath(`/clients/${values.clientId}`);
  revalidatePath("/tasks");
  const locale = await getLocale();
  redirect({ href: `/cases/${id}`, locale });
}

export async function updateCaseStatusAction(
  id: string,
  status: (typeof caseStatusEnum.enumValues)[number],
) {
  const db = getDb();

  const [existing] = await db
    .select({
      status: cases.status,
      clientId: cases.clientId,
      title: cases.title,
    })
    .from(cases)
    .where(eq(cases.id, id))
    .limit(1);

  await db
    .update(cases)
    .set({ status, updatedAt: new Date(), closedDate: closedDateFor(status) })
    .where(eq(cases.id, id));

  if (existing && existing.status !== status) {
    await recordStatusChange(id, existing.status, status);

    if (status === "completed") {
      await db.insert(tasks).values({
        clientId: existing.clientId,
        caseId: id,
        type: "closing",
        title: `Close out: ${existing.title}`,
      });
    }
  }

  revalidatePath("/cases");
  revalidatePath(`/cases/${id}`);
  revalidatePath("/tasks");
}

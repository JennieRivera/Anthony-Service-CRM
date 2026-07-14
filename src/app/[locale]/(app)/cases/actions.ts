"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  cases,
  clients,
  notaryLogEntries,
  apostilleDetails,
  caseStatusEnum,
} from "@/lib/db/schema";
import {
  caseFormSchema,
  notaryServiceTypes,
  type CaseFormValues,
} from "@/lib/validation/case";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

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
    })
    .returning({ id: cases.id });

  await upsertServiceDetails(created.id, values.clientId, values);

  revalidatePath("/cases");
  revalidatePath(`/clients/${values.clientId}`);
  const locale = await getLocale();
  redirect({ href: `/cases/${created.id}`, locale });
}

export async function updateCaseAction(id: string, rawValues: CaseFormValues) {
  const values = caseFormSchema.parse(rawValues);
  const db = getDb();

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
    })
    .where(eq(cases.id, id));

  await upsertServiceDetails(id, values.clientId, values);

  revalidatePath("/cases");
  revalidatePath(`/cases/${id}`);
  revalidatePath(`/clients/${values.clientId}`);
  const locale = await getLocale();
  redirect({ href: `/cases/${id}`, locale });
}

export async function updateCaseStatusAction(
  id: string,
  status: (typeof caseStatusEnum.enumValues)[number],
) {
  const db = getDb();
  await db
    .update(cases)
    .set({ status, updatedAt: new Date() })
    .where(eq(cases.id, id));

  revalidatePath("/cases");
}

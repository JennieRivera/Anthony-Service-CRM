"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getCertificateIssuanceContext,
  getCertificateEligibility,
  issueCertificate,
  revokeCertificate,
} from "@/lib/queries/academyCertificates";
import {
  issueCertificateFormSchema,
  revokeCertificateFormSchema,
  type IssueCertificateFormValues,
  type RevokeCertificateFormValues,
} from "@/lib/validation/academyCertificate";
import { logAuditEvent } from "@/lib/audit";

// The dialog already disables its submit button until a required field is
// filled, so this only ever fires if that client-side guard is somehow
// bypassed — but when it does fire, the caller's catch block does
// `err.message`, and a raw ZodError's message is an unreadable JSON dump
// of its issues array. This turns that into the first validation
// message's plain text instead.
function firstZodIssueMessage(err: unknown): string | null {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? null;
  return null;
}

// Certificate issuance is always this one explicit admin action — nothing
// else in the app ever inserts into academy_certificates. Student/course/
// program names are re-read here from the database (never trusted from
// the form), and eligibility is recomputed server-side too, so a stale
// client-side eligibility snapshot can never be used to bypass the
// override-reason requirement enforced by issueCertificateFormSchema.
export async function issueCertificateAction(
  enrollmentCaseId: string,
  rawValues: IssueCertificateFormValues,
) {
  let values: ReturnType<typeof issueCertificateFormSchema.parse>;
  try {
    values = issueCertificateFormSchema.parse(rawValues);
  } catch (err) {
    throw new Error(firstZodIssueMessage(err) ?? "Invalid certificate details");
  }

  const context = await getCertificateIssuanceContext(enrollmentCaseId);
  if (!context) throw new Error("Enrollment not found");

  const eligibility = await getCertificateEligibility(enrollmentCaseId, context.course);
  if (eligibility.verdict !== "eligible" && !values.overrideUsed) {
    throw new Error(
      "This student does not meet the requirements for a certificate. Use the override option to issue anyway.",
    );
  }

  const certificate = await issueCertificate({
    enrollmentCaseId,
    clientId: context.clientId,
    courseId: context.courseId,
    programId: context.programId,
    studentName: context.studentName,
    courseName: context.courseName,
    programName: context.programName,
    values,
  });

  await logAuditEvent({
    action: "academy_certificate.issued",
    entityType: "academy_certificate",
    entityId: certificate.id,
    summary: `Issued Academy certificate for "${context.studentName}" (${context.courseName})${
      values.overrideUsed ? " — override used" : ""
    }`,
  });

  revalidatePath(`/cases/${enrollmentCaseId}`);
  revalidatePath("/academy/certificates");
}

export async function revokeCertificateAction(
  id: string,
  enrollmentCaseId: string,
  rawValues: RevokeCertificateFormValues,
) {
  let values: ReturnType<typeof revokeCertificateFormSchema.parse>;
  try {
    values = revokeCertificateFormSchema.parse(rawValues);
  } catch (err) {
    throw new Error(firstZodIssueMessage(err) ?? "Invalid revocation details");
  }

  const certificate = await revokeCertificate(id, values);

  await logAuditEvent({
    action: "academy_certificate.revoked",
    entityType: "academy_certificate",
    entityId: certificate.id,
    summary: `Revoked Academy certificate for "${certificate.studentNameSnapshot}" (${certificate.courseNameSnapshot})`,
  });

  revalidatePath(`/cases/${enrollmentCaseId}`);
  revalidatePath("/academy/certificates");
}

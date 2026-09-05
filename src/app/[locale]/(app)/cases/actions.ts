"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  cases,
  clients,
  notaryLogEntries,
  apostilleDetails,
  notaryServiceDetails,
  taxServiceDetails,
  bookkeepingServiceDetails,
  immigrationServiceDetails,
  creditServiceDetails,
  consultingServiceDetails,
  businessFormationDetails,
  academyEnrollmentDetails,
  marketingProjectDetails,
  salesTaxCaseDetails,
  caseStatusEnum,
  caseStatusHistory,
  tasks,
  taskTypeEnum,
} from "@/lib/db/schema";
import {
  caseFormSchema,
  notaryServiceTypes,
  taxServiceTypes,
  bookkeepingServiceTypes,
  immigrationServiceTypes,
  creditServiceTypes,
  consultingServiceTypes,
  formationServiceTypes,
  academyServiceTypes,
  marketingServiceTypes,
  salesTaxServiceTypes,
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

// Phase 2, Session 1 — the category-specific pipeline status (10-13 values)
// is the single source of truth for these categories; it drives the coarse
// cases.status (and therefore the Session 0 audit trail / task engine)
// instead of a second, independently-editable status field.
function deriveEffectiveStatus(
  values: CaseFormValues,
): (typeof caseStatusEnum.enumValues)[number] {
  if (notaryServiceTypes.includes(values.serviceType) && values.notaryCaseStatus) {
    const s = values.notaryCaseStatus;
    if (s === "cancelled") return "cancelled";
    if (s === "completed" || s === "closed") return "completed";
    if (s === "new_request") return "new";
    return "in_progress";
  }

  if (taxServiceTypes.includes(values.serviceType) && values.taxCaseStatus) {
    const s = values.taxCaseStatus;
    if (s === "completed") return "completed";
    if (s === "rejected_correction_needed") return "waiting_on_client";
    if (s === "new_client") return "new";
    return "in_progress";
  }

  if (
    bookkeepingServiceTypes.includes(values.serviceType) &&
    values.bookkeepingCaseStatus
  ) {
    const s = values.bookkeepingCaseStatus;
    if (s === "closed") return "completed";
    if (s === "paused") return "waiting_on_client";
    if (s === "lead") return "new";
    return "in_progress";
  }

  if (
    immigrationServiceTypes.includes(values.serviceType) &&
    values.immigrationCaseStatus
  ) {
    const s = values.immigrationCaseStatus;
    if (s === "cancelled") return "cancelled";
    if (s === "completed") return "completed";
    if (s === "client_instructions_pending") return "waiting_on_client";
    if (s === "new_inquiry") return "new";
    return "in_progress";
  }

  if (
    creditServiceTypes.includes(values.serviceType) &&
    values.creditCaseStatus
  ) {
    const s = values.creditCaseStatus;
    if (s === "cancelled") return "cancelled";
    if (s === "completed") return "completed";
    if (s === "new_inquiry") return "new";
    return "in_progress";
  }

  if (
    consultingServiceTypes.includes(values.serviceType) &&
    values.consultingCaseStatus
  ) {
    const s = values.consultingCaseStatus;
    if (s === "completed") return "completed";
    if (s === "lead") return "new";
    return "in_progress";
  }

  if (
    formationServiceTypes.includes(values.serviceType) &&
    values.formationCaseStatus
  ) {
    const s = values.formationCaseStatus;
    if (s === "completed") return "completed";
    if (s === "new_inquiry") return "new";
    return "in_progress";
  }

  if (
    academyServiceTypes.includes(values.serviceType) &&
    values.academyCaseStatus
  ) {
    const s = values.academyCaseStatus;
    if (s === "completed" || s === "certified") return "completed";
    if (s === "inactive") return "cancelled";
    if (s === "lead") return "new";
    return "in_progress";
  }

  if (
    marketingServiceTypes.includes(values.serviceType) &&
    values.marketingCaseStatus
  ) {
    const s = values.marketingCaseStatus;
    if (s === "completed") return "completed";
    if (s === "discovery") return "new";
    return "in_progress";
  }

  if (
    salesTaxServiceTypes.includes(values.serviceType) &&
    values.salesTaxCaseStatus
  ) {
    const s = values.salesTaxCaseStatus;
    if (s === "closed") return "completed";
    if (s === "past_due") return "waiting_on_client";
    if (s === "not_started" || s === "research_required") return "new";
    return "in_progress";
  }

  return values.status;
}

// Notary's "Total Fee" isn't its own column — it's the sum of the fee
// breakdown, computed server-side the same way invoice totals are, and
// stored on the shared cases.fee column (the general "Amount" field).
function computeCaseFee(values: CaseFormValues): string | null {
  if (notaryServiceTypes.includes(values.serviceType)) {
    const parts = [values.notaryServiceFee, values.travelFee, values.printingFee]
      .map((v) => Number(v) || 0);
    const sum = parts.reduce((a, b) => a + b, 0);
    if (sum > 0) return sum.toFixed(2);
  }
  return values.fee || null;
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

    if (values.notaryModality) {
      const detail = {
        modality: values.notaryModality,
        appointmentDate: values.appointmentDate || null,
        appointmentTime: values.appointmentTime || null,
        location: values.location || null,
        numberOfSigners: values.numberOfSigners
          ? Number(values.numberOfSigners)
          : null,
        numberOfDocuments: values.numberOfDocuments
          ? Number(values.numberOfDocuments)
          : null,
        numberOfNotarialActs: values.numberOfNotarialActs
          ? Number(values.numberOfNotarialActs)
          : null,
        idVerificationStatus: values.idVerificationStatus || null,
        witnessRequired: values.witnessRequired ?? false,
        witnessProvidedBy: values.witnessProvidedBy || null,
        documentType: values.notaryDocumentType || null,
        loanSigningCompany: values.loanSigningCompany || null,
        titleCompany: values.titleCompany || null,
        signingService: values.signingService || null,
        scanbacksRequired: values.scanbacksRequired ?? false,
        shippingRequired: values.shippingRequired ?? false,
        trackingNumber: values.trackingNumber || null,
        notaryFee: values.notaryServiceFee
          ? Number(values.notaryServiceFee).toFixed(2)
          : null,
        travelFee: values.travelFee ? Number(values.travelFee).toFixed(2) : null,
        printingFee: values.printingFee
          ? Number(values.printingFee).toFixed(2)
          : null,
        status: values.notaryCaseStatus || "new_request",
      };

      await db
        .insert(notaryServiceDetails)
        .values({ caseId, ...detail })
        .onConflictDoUpdate({ target: notaryServiceDetails.caseId, set: detail });
    }
    return;
  }

  if (taxServiceTypes.includes(values.serviceType)) {
    if (values.taxYear && values.filerType) {
      const detail = {
        taxYear: Number(values.taxYear),
        filerType: values.filerType,
        jurisdiction: values.jurisdiction || "federal",
        returnType: values.returnType || null,
        filingStatus: values.filingStatus || null,
        businessEntityType: values.businessEntityType || null,
        intakeCompleted: values.intakeCompleted ?? false,
        efileAuthorizationSigned: values.efileAuthorizationSigned ?? false,
        refundAmount: values.refundAmount
          ? Number(values.refundAmount).toFixed(2)
          : null,
        balanceDueAmount: values.balanceDueAmount
          ? Number(values.balanceDueAmount).toFixed(2)
          : null,
        amountPaid: values.taxAmountPaid
          ? Number(values.taxAmountPaid).toFixed(2)
          : "0",
        internalNotes: values.internalNotes || null,
        status: values.taxCaseStatus || "new_client",
      };

      await db
        .insert(taxServiceDetails)
        .values({ caseId, ...detail })
        .onConflictDoUpdate({ target: taxServiceDetails.caseId, set: detail });
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
    return;
  }

  if (bookkeepingServiceTypes.includes(values.serviceType)) {
    const detail = {
      businessName: values.businessName || null,
      entityType: values.entityType || null,
      industry: values.industry || null,
      frequency: values.bookkeepingFrequency || null,
      accountingSoftware: values.accountingSoftware || null,
      numberOfBankAccounts: values.numberOfBankAccounts
        ? Number(values.numberOfBankAccounts)
        : null,
      numberOfCreditCardAccounts: values.numberOfCreditCardAccounts
        ? Number(values.numberOfCreditCardAccounts)
        : null,
      payrollUsed: values.payrollUsed ?? false,
      monthlyRevenueRange: values.monthlyRevenueRange || null,
      lastMonthReconciled: values.lastMonthReconciled || null,
      cleanupRequired: values.cleanupRequired ?? false,
      catchUpStartMonth: values.catchUpStartMonth || null,
      catchUpEndMonth: values.catchUpEndMonth || null,
      nextBillingDate: values.nextBillingDate || null,
      reportsRequired: values.reportsRequired || null,
      profitLossStatus: values.profitLossStatus || null,
      balanceSheetStatus: values.balanceSheetStatus || null,
      status: values.bookkeepingCaseStatus || "lead",
    };

    await db
      .insert(bookkeepingServiceDetails)
      .values({ caseId, ...detail })
      .onConflictDoUpdate({
        target: bookkeepingServiceDetails.caseId,
        set: detail,
      });
    return;
  }

  if (immigrationServiceTypes.includes(values.serviceType)) {
    const detail = {
      administrativeServiceType: values.administrativeServiceType || null,
      formNumber: values.formNumber || null,
      clientRequestedForm: values.clientRequestedForm ?? false,
      clientProvidedInstructions: values.clientProvidedInstructions || null,
      language: values.language || null,
      translationNeeded: values.translationNeeded ?? false,
      translationStatus: values.translationStatus || null,
      attorneyReferralNeeded: values.attorneyReferralNeeded ?? false,
      attorneyReferralDate: values.attorneyReferralDate || null,
      governmentFilingFee: values.governmentFilingFee
        ? Number(values.governmentFilingFee).toFixed(2)
        : null,
      status: values.immigrationCaseStatus || "new_inquiry",
    };

    await db
      .insert(immigrationServiceDetails)
      .values({ caseId, ...detail })
      .onConflictDoUpdate({
        target: immigrationServiceDetails.caseId,
        set: detail,
      });
    return;
  }

  if (creditServiceTypes.includes(values.serviceType)) {
    const detail = {
      creditServiceType: values.creditServiceType || null,
      accountType: values.accountType || null,
      initialConsultationDate: values.initialConsultationDate || null,
      creditEducationCompleted: values.creditEducationCompleted ?? false,
      creditReportReviewDate: values.creditReportReviewDate || null,
      mainClientGoal: values.mainClientGoal || null,
      status: values.creditCaseStatus || "new_inquiry",
    };

    await db
      .insert(creditServiceDetails)
      .values({ caseId, ...detail })
      .onConflictDoUpdate({
        target: creditServiceDetails.caseId,
        set: detail,
      });
    return;
  }

  if (consultingServiceTypes.includes(values.serviceType)) {
    const detail = {
      businessProblem: values.businessProblem || null,
      businessStage: values.businessStage || null,
      diagnosisSummary: values.diagnosisSummary || null,
      primaryGoal: values.primaryGoal || null,
      recommendedStrategy: values.recommendedStrategy || null,
      consultingPackage: values.consultingPackage || null,
      numberOfSessions: values.numberOfSessions
        ? Number(values.numberOfSessions)
        : null,
      sessionsCompleted: values.sessionsCompleted
        ? Number(values.sessionsCompleted)
        : null,
      milestones: values.milestones || null,
      actionPlan: values.actionPlan || null,
      goal30Day: values.goal30Day || null,
      goal90Day: values.goal90Day || null,
      completionPercentage: values.completionPercentage
        ? Number(values.completionPercentage)
        : null,
      status: values.consultingCaseStatus || "lead",
    };

    await db
      .insert(consultingServiceDetails)
      .values({ caseId, ...detail })
      .onConflictDoUpdate({
        target: consultingServiceDetails.caseId,
        set: detail,
      });
    return;
  }

  if (formationServiceTypes.includes(values.serviceType)) {
    const detail = {
      formationType: values.formationType || null,
      stateOfFormation: values.stateOfFormation || null,
      businessName: values.formationBusinessName || null,
      nameAvailabilityChecked: values.nameAvailabilityChecked ?? false,
      registeredAgent: values.registeredAgent || null,
      einAssistance: values.einAssistance ?? false,
      stateFilingDate: values.stateFilingDate || null,
      stateApprovalDate: values.stateApprovalDate || null,
      documentDeliveryStatus: values.documentDeliveryStatus || null,
      governmentFee: values.governmentFee
        ? Number(values.governmentFee).toFixed(2)
        : null,
      status: values.formationCaseStatus || "new_inquiry",
    };

    await db
      .insert(businessFormationDetails)
      .values({ caseId, ...detail })
      .onConflictDoUpdate({
        target: businessFormationDetails.caseId,
        set: detail,
      });
    return;
  }

  if (academyServiceTypes.includes(values.serviceType)) {
    const detail = {
      program: values.program || null,
      course: values.course || null,
      enrollmentDate: values.enrollmentDate || null,
      modulesCompleted: values.modulesCompleted
        ? Number(values.modulesCompleted)
        : null,
      progressPercentage: values.progressPercentage
        ? Number(values.progressPercentage)
        : null,
      attendancePercentage: values.attendancePercentage
        ? Number(values.attendancePercentage)
        : null,
      assignmentsCompleted: values.assignmentsCompleted
        ? Number(values.assignmentsCompleted)
        : null,
      finalEvaluation: values.finalEvaluation || null,
      certificateDate: values.certificateDate || null,
      communityAccess: values.communityAccess ?? false,
      highlevelSyncStatus: values.highlevelSyncStatus || "not_synced",
      status: values.academyCaseStatus || "lead",
    };

    await db
      .insert(academyEnrollmentDetails)
      .values({ caseId, ...detail })
      .onConflictDoUpdate({
        target: academyEnrollmentDetails.caseId,
        set: detail,
      });
    return;
  }

  if (marketingServiceTypes.includes(values.serviceType)) {
    const detail = {
      projectType: values.projectType || null,
      businessGoal: values.businessGoal || null,
      currentSystems: values.currentSystems || null,
      deliverables: values.deliverables || null,
      integrationsRequired: values.integrationsRequired || null,
      aiAgentRequired: values.aiAgentRequired ?? false,
      completionPercentage: values.marketingCompletionPercentage
        ? Number(values.marketingCompletionPercentage)
        : null,
      status: values.marketingCaseStatus || "discovery",
    };

    await db
      .insert(marketingProjectDetails)
      .values({ caseId, ...detail })
      .onConflictDoUpdate({
        target: marketingProjectDetails.caseId,
        set: detail,
      });
    return;
  }

  if (salesTaxServiceTypes.includes(values.serviceType)) {
    if (values.salesTaxState) {
      const detail = {
        companyId: values.companyId || null,
        state: values.salesTaxState.toUpperCase(),
        stateTaxAgency: values.stateTaxAgency || null,
        agencyWebsite: values.agencyWebsite || null,
        registrationPortalUrl: values.registrationPortalUrl || null,
        salesTaxAccountNumber: values.salesTaxAccountNumber || null,
        registrationDate: values.registrationDate || null,
        effectiveDate: values.effectiveDate || null,
        filingFrequency: values.filingFrequency || null,
        nextFilingDueDate: values.nextFilingDueDate || null,
        lastFiledPeriod: values.lastFiledPeriod || null,
        lastFilingDate: values.lastFilingDate || null,
        amountDue: values.amountDue ? Number(values.amountDue).toFixed(2) : null,
        amountPaid: values.salesTaxAmountPaid
          ? Number(values.salesTaxAmountPaid).toFixed(2)
          : null,
        paymentDate: values.salesTaxPaymentDate || null,
        accountStatus: values.accountStatus || null,
        status: values.salesTaxCaseStatus || "not_started",
      };

      await db
        .insert(salesTaxCaseDetails)
        .values({ caseId, ...detail })
        .onConflictDoUpdate({
          target: salesTaxCaseDetails.caseId,
          set: detail,
        });
    }
    return;
  }
}

export async function createCaseAction(rawValues: CaseFormValues) {
  const values = caseFormSchema.parse(rawValues);
  const db = getDb();
  const effectiveStatus = deriveEffectiveStatus(values);
  const fee = computeCaseFee(values);

  const [created] = await db
    .insert(cases)
    .values({
      clientId: values.clientId,
      serviceType: values.serviceType,
      status: effectiveStatus,
      title: values.title,
      dueDate: values.dueDate || null,
      fee,
      notes: values.notes || null,
      startDate: values.startDate,
      nextFollowUpDate: values.nextFollowUpDate || null,
      documentsRequested: values.documentsRequested || null,
      documentsReceived: values.documentsReceived || null,
      paymentStatus: values.paymentStatus || null,
      referralSource: values.referralSource || null,
      nextAction: values.nextAction || null,
      closedDate: closedDateFor(effectiveStatus),
    })
    .returning({ id: cases.id });

  await upsertServiceDetails(created.id, values.clientId, values);
  await recordStatusChange(created.id, null, effectiveStatus);
  await runAutomaticTasks({
    caseId: created.id,
    clientId: values.clientId,
    title: values.title,
    isNewCase: true,
    justCompleted: effectiveStatus === "completed",
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
  const effectiveStatus = deriveEffectiveStatus(values);
  const fee = computeCaseFee(values);

  const [existing] = await db
    .select({ status: cases.status })
    .from(cases)
    .where(eq(cases.id, id))
    .limit(1);

  const statusChanged = Boolean(existing) && existing.status !== effectiveStatus;
  const justCompleted = statusChanged && effectiveStatus === "completed";

  await db
    .update(cases)
    .set({
      clientId: values.clientId,
      serviceType: values.serviceType,
      status: effectiveStatus,
      title: values.title,
      dueDate: values.dueDate || null,
      fee,
      notes: values.notes || null,
      updatedAt: new Date(),
      startDate: values.startDate,
      nextFollowUpDate: values.nextFollowUpDate || null,
      documentsRequested: values.documentsRequested || null,
      documentsReceived: values.documentsReceived || null,
      paymentStatus: values.paymentStatus || null,
      referralSource: values.referralSource || null,
      nextAction: values.nextAction || null,
      closedDate: closedDateFor(effectiveStatus),
    })
    .where(eq(cases.id, id));

  await upsertServiceDetails(id, values.clientId, values);

  if (existing && statusChanged) {
    await recordStatusChange(id, existing.status, effectiveStatus);
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

import { desc, eq } from "drizzle-orm";
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
  irsCaseDetails,
  insuranceComplianceDetails,
  companies,
  documents,
  caseStatusHistory,
} from "@/lib/db/schema";

export async function listCasesWithClient() {
  return getDb()
    .select({
      id: cases.id,
      createdAt: cases.createdAt,
      title: cases.title,
      serviceType: cases.serviceType,
      status: cases.status,
      dueDate: cases.dueDate,
      fee: cases.fee,
      clientId: clients.id,
      clientName: clients.fullName,
    })
    .from(cases)
    .innerJoin(clients, eq(cases.clientId, clients.id))
    .orderBy(desc(cases.createdAt));
}

// Calendar enhancement, Session 2 — feeds the appointment form's case
// selector, filtered client-side to the chosen client's own cases.
export async function listCasesForAppointmentSelect() {
  return getDb()
    .select({ id: cases.id, title: cases.title, clientId: cases.clientId })
    .from(cases)
    .orderBy(desc(cases.createdAt));
}

export async function listClientsForSelect() {
  return getDb()
    .select({
      id: clients.id,
      fullName: clients.fullName,
      folderNumber: clients.folderNumber,
    })
    .from(clients)
    .orderBy(clients.fullName);
}

export async function getCaseById(id: string) {
  const db = getDb();

  const [row] = await db
    .select({
      case: cases,
      client: clients,
    })
    .from(cases)
    .innerJoin(clients, eq(cases.clientId, clients.id))
    .where(eq(cases.id, id))
    .limit(1);

  if (!row) return null;

  const [
    notaryEntries,
    apostille,
    notaryDetails,
    taxDetails,
    bookkeepingDetails,
    immigrationDetails,
    creditDetails,
    consultingDetails,
    formationDetails,
    academyDetails,
    marketingDetails,
    salesTaxDetails,
    irsDetails,
    insuranceDetails,
    caseDocuments,
    statusHistory,
  ] = await Promise.all([
    db
      .select()
      .from(notaryLogEntries)
      .where(eq(notaryLogEntries.caseId, id))
      .orderBy(desc(notaryLogEntries.entryDate)),
    db
      .select()
      .from(apostilleDetails)
      .where(eq(apostilleDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(notaryServiceDetails)
      .where(eq(notaryServiceDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(taxServiceDetails)
      .where(eq(taxServiceDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(bookkeepingServiceDetails)
      .where(eq(bookkeepingServiceDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(immigrationServiceDetails)
      .where(eq(immigrationServiceDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(creditServiceDetails)
      .where(eq(creditServiceDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(consultingServiceDetails)
      .where(eq(consultingServiceDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(businessFormationDetails)
      .where(eq(businessFormationDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(academyEnrollmentDetails)
      .where(eq(academyEnrollmentDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(marketingProjectDetails)
      .where(eq(marketingProjectDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(salesTaxCaseDetails)
      .where(eq(salesTaxCaseDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(irsCaseDetails)
      .where(eq(irsCaseDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(insuranceComplianceDetails)
      .where(eq(insuranceComplianceDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(documents)
      .where(eq(documents.caseId, id))
      .orderBy(desc(documents.createdAt)),
    db
      .select()
      .from(caseStatusHistory)
      .where(eq(caseStatusHistory.caseId, id))
      .orderBy(desc(caseStatusHistory.changedAt)),
  ]);

  const salesTaxCompanyId = salesTaxDetails[0]?.companyId;
  const salesTaxCompany = salesTaxCompanyId
    ? (
        await db
          .select({ id: companies.id, legalBusinessName: companies.legalBusinessName })
          .from(companies)
          .where(eq(companies.id, salesTaxCompanyId))
          .limit(1)
      )[0] ?? null
    : null;

  const irsCompanyId = irsDetails[0]?.companyId;
  const irsCompany = irsCompanyId
    ? (
        await db
          .select({ id: companies.id, legalBusinessName: companies.legalBusinessName })
          .from(companies)
          .where(eq(companies.id, irsCompanyId))
          .limit(1)
      )[0] ?? null
    : null;

  const insuranceCompanyId = insuranceDetails[0]?.companyId;
  const insuranceCompany = insuranceCompanyId
    ? (
        await db
          .select({ id: companies.id, legalBusinessName: companies.legalBusinessName })
          .from(companies)
          .where(eq(companies.id, insuranceCompanyId))
          .limit(1)
      )[0] ?? null
    : null;

  return {
    case: row.case,
    client: row.client,
    notaryEntries,
    apostille: apostille[0] ?? null,
    notaryDetails: notaryDetails[0] ?? null,
    taxDetails: taxDetails[0] ?? null,
    bookkeepingDetails: bookkeepingDetails[0] ?? null,
    immigrationDetails: immigrationDetails[0] ?? null,
    creditDetails: creditDetails[0] ?? null,
    consultingDetails: consultingDetails[0] ?? null,
    formationDetails: formationDetails[0] ?? null,
    academyDetails: academyDetails[0] ?? null,
    marketingDetails: marketingDetails[0] ?? null,
    salesTaxDetails: salesTaxDetails[0] ?? null,
    salesTaxCompany,
    irsDetails: irsDetails[0] ?? null,
    irsCompany,
    insuranceDetails: insuranceDetails[0] ?? null,
    insuranceCompany,
    documents: caseDocuments,
    statusHistory,
  };
}

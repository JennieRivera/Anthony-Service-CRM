import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCompanyById, getCompany360Data } from "@/lib/queries/companies";
import { listClientsForSelect } from "@/lib/queries/cases";
import { listCompanyDocumentChecklistItems } from "@/lib/queries/companyDocumentChecklist";
import { getCompanyComplianceSummary } from "@/lib/queries/companyCompliance";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyOwnersSection } from "@/components/companies/CompanyOwnersSection";
import { CompanySimplePeopleSection } from "@/components/companies/CompanySimplePeopleSection";
import { CompanyProfileTabs } from "@/components/companies/CompanyProfileTabs";
import {
  createCompanyContactAction,
  deleteCompanyContactAction,
  createCompanyAuthorizedRepresentativeAction,
  deleteCompanyAuthorizedRepresentativeAction,
  createCompanyChecklistItemAction,
  updateCompanyChecklistItemAction,
  deleteCompanyChecklistItemAction,
} from "../actions";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Companies");
  const tEntityType = await getTranslations("CompanyEntityType");
  const tEinStatus = await getTranslations("CompanyEinStatus");
  const tAccountingMethod = await getTranslations("CompanyAccountingMethod");
  const tContacts = await getTranslations("Companies.contacts");
  const tReps = await getTranslations("Companies.representatives");

  const [result, clients, checklistItems, complianceSummary, companyActivity] =
    await Promise.all([
      getCompanyById(id),
      listClientsForSelect(),
      listCompanyDocumentChecklistItems(id),
      getCompanyComplianceSummary(id),
      getCompany360Data(id),
    ]);
  if (!result || !complianceSummary) notFound();

  const { company, owners, contacts, representatives, linkedClients } = result;

  const profile = (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl text-foreground">
              {company.legalBusinessName}
            </h1>
            {company.entityType && (
              <Badge variant="outline">{tEntityType(company.entityType)}</Badge>
            )}
          </div>
          <Badge variant="outline">{tEinStatus(company.einStatus)}</Badge>
        </div>
        {company.dbaName && (
          <p className="text-sm text-muted-foreground">DBA: {company.dbaName}</p>
        )}
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t("form.stateOfFormation")}</p>
            <p className="text-foreground">{company.stateOfFormation ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.formationDate")}</p>
            <p className="text-foreground">
              {company.formationDate
                ? new Date(company.formationDate).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.einLast4")}</p>
            <p className="text-foreground">
              {company.einLast4 ? `•••••${company.einLast4}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.industry")}</p>
            <p className="text-foreground">{company.industry ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.phone")}</p>
            <p className="text-foreground">{company.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.email")}</p>
            <p className="text-foreground">{company.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.website")}</p>
            <p className="text-foreground">{company.website ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.accountingMethod")}</p>
            <p className="text-foreground">
              {company.accountingMethod
                ? tAccountingMethod(company.accountingMethod)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.annualRevenueRange")}</p>
            <p className="text-foreground">{company.annualRevenueRange ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.salesTaxRequired")}</p>
            <p className="text-foreground">
              {company.salesTaxRequired
                ? company.salesTaxStates?.join(", ") || "✓"
                : "—"}
            </p>
          </div>
        </div>
        {company.businessDescription && (
          <p className="text-sm text-foreground">{company.businessDescription}</p>
        )}
        {company.notes && (
          <div className="text-sm">
            <p className="text-muted-foreground">{t("form.notes")}</p>
            <p className="whitespace-pre-wrap text-foreground">{company.notes}</p>
          </div>
        )}
      </div>

      {linkedClients.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-lg text-foreground">
            {t("linkedClients")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {linkedClients.map((client) => (
              <Link key={client.id} href={`/clients/${client.id}`}>
                <Badge variant="outline">{client.fullName}</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      <CompanyOwnersSection companyId={id} owners={owners} clients={clients} />

      <CompanySimplePeopleSection
        companyId={id}
        people={contacts}
        clients={clients}
        labels={{
          title: tContacts("title"),
          add: tContacts("add"),
          name: tContacts("name"),
          role: tContacts("role"),
          phone: tContacts("phone"),
          email: tContacts("email"),
          linkedClient: tContacts("linkedClient"),
          noLinkedClient: tContacts("noLinkedClient"),
          empty: tContacts("empty"),
          save: tContacts("save"),
          saving: tContacts("saving"),
        }}
        onCreate={createCompanyContactAction}
        onDelete={deleteCompanyContactAction}
      />

      <CompanySimplePeopleSection
        companyId={id}
        people={representatives}
        clients={clients}
        labels={{
          title: tReps("title"),
          add: tReps("add"),
          name: tReps("name"),
          role: tReps("role"),
          phone: tReps("phone"),
          email: tReps("email"),
          linkedClient: tReps("linkedClient"),
          noLinkedClient: tReps("noLinkedClient"),
          empty: tReps("empty"),
          save: tReps("save"),
          saving: tReps("saving"),
        }}
        onCreate={createCompanyAuthorizedRepresentativeAction}
        onDelete={deleteCompanyAuthorizedRepresentativeAction}
      />
    </>
  );

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link href="/companies" className="text-sm text-muted-foreground underline">
          &larr; {t("backToCompanies")}
        </Link>
        <Button render={<Link href={`/companies/${id}/edit`} />}>
          <Pencil className="h-4 w-4" />
          {t("editCompany")}
        </Button>
      </div>

      <CompanyProfileTabs
        companyId={id}
        profile={profile}
        checklistItems={checklistItems}
        complianceSummary={complianceSummary}
        cases={companyActivity.cases}
        invoices={companyActivity.invoices}
        payments={companyActivity.payments}
        appointments={companyActivity.appointments}
        tasks={companyActivity.tasks}
        conversations={companyActivity.conversations}
        referrals={companyActivity.referrals}
        documents={companyActivity.documents}
        timeline={companyActivity.timeline}
        outstandingBalance={companyActivity.outstandingBalance}
        onCreateChecklistItem={createCompanyChecklistItemAction}
        onUpdateChecklistItemStatus={updateCompanyChecklistItemAction}
        onDeleteChecklistItem={deleteCompanyChecklistItemAction}
      />
    </div>
  );
}

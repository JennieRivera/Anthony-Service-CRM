"use client";

import { formatDate } from "@/lib/dates";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Stamp,
  Calculator,
  Globe,
  LineChart,
  Target,
  Building2,
  GraduationCap,
  Megaphone,
  Users,
  Handshake,
  ShieldCheck,
  FolderOpen,
  FileText,
  ChevronRight,
  Folder,
  Download,
  Cpu,
  PartyPopper,
  Hammer,
  BookMarked,
  Receipt,
  Network,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentStatusPill } from "@/components/documents/StatusPill";
import { viewHref, downloadHref } from "@/components/documents/downloadHref";
import { MoveCategorySelect } from "@/components/documents/MoveCategorySelect";
import { MoveServiceFolderSelect } from "@/components/documents/MoveServiceFolderSelect";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import {
  documentFolder,
  drawerColor,
  drawerValues,
  isServiceFolder,
  serviceFolderFor,
  type Drawer,
  type ServiceFolder,
} from "@/lib/validation/documentDrawer";
import { immigrationDocumentFolderValues } from "@/lib/validation/immigrationDocumentFolder";
import { AllianceDocumentUploader } from "@/components/alliances/AllianceDocumentUploader";
import type {
  listAllDocuments,
  listReferralsForFolders,
  listAcademyEnrollmentsForFolders,
} from "@/lib/queries/documents";
import type { listAlliances, listAllianceDocuments } from "@/lib/queries/alliances";
import type { ServiceTypeValue } from "@/lib/validation/client";

type DocumentRow = Awaited<ReturnType<typeof listAllDocuments>>[number];
type ReferralFolder = Awaited<ReturnType<typeof listReferralsForFolders>>[number];
type AllianceRow = Awaited<ReturnType<typeof listAlliances>>[number];
type AllianceDocRow = Awaited<ReturnType<typeof listAllianceDocuments>>[number];
type AcademyEnrollmentRow = Awaited<ReturnType<typeof listAcademyEnrollmentsForFolders>>[number];
type ClientOption = { id: string; fullName: string; folderNumber: string | null };
type CaseOption = { id: string; title: string; clientId: string; serviceType: ServiceTypeValue };

const DRAWER_ICONS: Record<Drawer, LucideIcon> = {
  company_registration: Building2,
  tax_prep: Calculator,
  bookkeeping: BookMarked,
  sales_tax: Receipt,
  irs_administrative: FileText,
  notary: Stamp,
  document_prep: FileText,
  immigration: Globe,
  leadership: Target,
  credit_financing: LineChart,
  crm_technology: Cpu,
  marketing: Megaphone,
  insurance_compliance: ShieldCheck,
  academy: GraduationCap,
  corporate_events: PartyPopper,
  remodeling: Hammer,
  clientes: Users,
  alianzas: Network,
  referidos: Handshake,
  otros: FolderOpen,
};

const folderOf = (doc: DocumentRow): Drawer => documentFolder(doc);

function folderLabel(number: string | null, name: string): string {
  return number ? `${number} — ${name}` : name;
}

type View =
  | { level: "drawers" }
  | { level: "clients"; drawer: ServiceFolder | "clientes" }
  | { level: "client-docs"; drawer: ServiceFolder | "clientes"; clientId: string }
  | { level: "referrals" }
  | { level: "referral-docs"; referralId: string }
  | { level: "alliances" }
  | { level: "alliance-docs"; allianceId: string }
  | { level: "otros" };

// The Documents archive: one folder per service (the single services list)
// plus Clients, Alliances, Referrals and Other. Every document lives in
// exactly ONE folder, decided by where it was uploaded — see
// documentFolder() in src/lib/validation/documentDrawer.ts. Folder
// counters count documents.
export function DocumentsCabinet({
  documents,
  clients,
  cases,
  referrals,
  alliances,
  allianceDocuments,
  academyEnrollments,
  serviceColors,
  blobConfigured,
}: {
  documents: DocumentRow[];
  clients: ClientOption[];
  cases: CaseOption[];
  referrals: ReferralFolder[];
  alliances: AllianceRow[];
  allianceDocuments: AllianceDocRow[];
  academyEnrollments: AcademyEnrollmentRow[];
  serviceColors: Record<string, string>;
  blobConfigured: boolean;
}) {
  const t = useTranslations("Documents");
  const tDrawer = useTranslations("DocumentDrawer");
  const tService = useTranslations("ServiceType");
  const [view, setView] = useState<View>({ level: "drawers" });

  const drawerLabel = (d: Drawer) => (isServiceFolder(d) ? tService(d) : tDrawer(d));
  const color = (d: Drawer) => drawerColor(d, serviceColors);

  const drawerCounts = useMemo(() => {
    const map = new Map<Drawer, number>();
    for (const doc of documents) {
      const d = folderOf(doc);
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    map.set("alianzas", allianceDocuments.length);
    return map;
  }, [documents, allianceDocuments]);

  if (view.level === "drawers") {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {drawerValues.map((drawer) => {
          const Icon = DRAWER_ICONS[drawer];
          const count = drawerCounts.get(drawer) ?? 0;
          return (
            <button
              key={drawer}
              type="button"
              onClick={() =>
                setView(
                  drawer === "referidos"
                    ? { level: "referrals" }
                    : drawer === "alianzas"
                      ? { level: "alliances" }
                      : drawer === "otros"
                        ? { level: "otros" }
                        : { level: "clients", drawer },
                )
              }
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-foreground/30"
              style={{ borderTopWidth: 4, borderTopColor: color(drawer) }}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5" style={{ color: color(drawer) }} />
                <span
                  className={
                    count > 0
                      ? "rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {t("clientFolderCount", { count })}
                </span>
              </div>
              <span className="font-heading text-base text-foreground">{drawerLabel(drawer)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (view.level === "clients") {
    const { drawer } = view;
    const docsHere = documents.filter((d) => folderOf(d) === drawer);
    // A client is in a service folder if they have a case of that service,
    // a document filed there, or (Academy) an enrollment. Clients lists
    // everyone, so staff can file general documents for any client.
    const ids = new Set<string>(docsHere.map((d) => d.clientId));
    if (drawer === "clientes") {
      for (const c of clients) ids.add(c.id);
    } else {
      for (const c of cases) if (serviceFolderFor(c.serviceType) === drawer) ids.add(c.clientId);
      if (drawer === "academy") for (const e of academyEnrollments) ids.add(e.clientId);
    }
    const countFor = (clientId: string) => docsHere.filter((d) => d.clientId === clientId).length;
    const folderClients = clients
      .filter((c) => ids.has(c.id))
      .sort((a, b) => countFor(b.id) - countFor(a.id) || a.fullName.localeCompare(b.fullName));

    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb
          items={[
            { label: t("backToDrawers"), onClick: () => setView({ level: "drawers" }) },
            { label: drawerLabel(drawer) },
          ]}
        />
        {drawer === "clientes" && <p className="text-sm text-muted-foreground">{t("clientsDrawerHint")}</p>}
        {folderClients.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            {t("noClientsInDrawer")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {folderClients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => setView({ level: "client-docs", drawer, clientId: client.id })}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-4 text-left hover:border-foreground/30"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Folder className="h-4 w-4 shrink-0" style={{ color: color(drawer) }} />
                  <span className="truncate text-sm font-medium text-foreground">
                    {folderLabel(client.folderNumber, client.fullName)}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t("clientFolderCount", { count: countFor(client.id) })}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view.level === "client-docs") {
    const { drawer, clientId } = view;
    const client = clients.find((c) => c.id === clientId);
    const clientDocs = documents.filter((d) => d.clientId === clientId && folderOf(d) === drawer);
    const matchingCases =
      drawer === "clientes"
        ? []
        : cases.filter((c) => c.clientId === clientId && serviceFolderFor(c.serviceType) === drawer);
    const studentEnrollments =
      drawer === "academy" ? academyEnrollments.filter((e) => e.clientId === clientId) : [];

    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb
          items={[
            { label: t("backToDrawers"), onClick: () => setView({ level: "drawers" }) },
            { label: drawerLabel(drawer), onClick: () => setView({ level: "clients", drawer }) },
            { label: client ? folderLabel(client.folderNumber, client.fullName) : "" },
          ]}
        />

        {drawer === "academy" && <StudentEnrollments enrollments={studentEnrollments} />}

        {blobConfigured && (
          <ClientDocUploader
            clientId={clientId}
            drawer={drawer}
            matchingCases={matchingCases}
            showFolderSelect={drawer === "immigration"}
          />
        )}

        <CabinetDocumentList
          documents={clientDocs}
          groupByImmigrationFolder={drawer === "immigration"}
          emptyMessage={t("empty")}
        />
      </div>
    );
  }

  if (view.level === "referrals") {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb
          items={[
            { label: t("backToDrawers"), onClick: () => setView({ level: "drawers" }) },
            { label: tDrawer("referidos") },
          ]}
        />
        <p className="text-sm text-muted-foreground">{t("referralsDrawerHint")}</p>
        {referrals.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            {t("noReferrals")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {referrals.map((referral) => {
              const count = documents.filter((d) => d.referralId === referral.id).length;
              return (
                <button
                  key={referral.id}
                  type="button"
                  onClick={() => setView({ level: "referral-docs", referralId: referral.id })}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-4 text-left hover:border-foreground/30"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Folder className="h-4 w-4 shrink-0" style={{ color: color("referidos") }} />
                    <span className="truncate text-sm font-medium text-foreground">
                      R-{String(referral.referralSeq).padStart(3, "0")} — {referral.clientName}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t("clientFolderCount", { count })}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (view.level === "alliances") {
    const countFor = (allianceId: string) => allianceDocuments.filter((d) => d.allianceId === allianceId).length;
    const sorted = [...alliances].sort(
      (a, b) => countFor(b.id) - countFor(a.id) || a.organizationName.localeCompare(b.organizationName),
    );
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb
          items={[
            { label: t("backToDrawers"), onClick: () => setView({ level: "drawers" }) },
            { label: tDrawer("alianzas") },
          ]}
        />
        <p className="text-sm text-muted-foreground">{t("alliancesDrawerHint")}</p>
        {alliances.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            {t("noAlliancesLinked")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((alliance) => (
              <button
                key={alliance.id}
                type="button"
                onClick={() => setView({ level: "alliance-docs", allianceId: alliance.id })}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-4 text-left hover:border-foreground/30"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Folder className="h-4 w-4 shrink-0" style={{ color: color("alianzas") }} />
                  <span className="truncate text-sm font-medium text-foreground">{alliance.organizationName}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t("clientFolderCount", { count: countFor(alliance.id) })}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view.level === "alliance-docs") {
    const alliance = alliances.find((a) => a.id === view.allianceId);
    const linkedReferrals = referrals.filter((r) => r.allianceId === view.allianceId);
    const allianceDocs = allianceDocuments.filter((d) => d.allianceId === view.allianceId);
    const contractSigned = alliance?.referralAgreement || alliance?.commissionAgreement;

    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb
          items={[
            { label: t("backToDrawers"), onClick: () => setView({ level: "drawers" }) },
            { label: tDrawer("alianzas"), onClick: () => setView({ level: "alliances" }) },
            { label: alliance?.organizationName ?? "" },
          ]}
        />

        {alliance && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("contractStatusLabel")}:</span>
            <span
              className={
                contractSigned
                  ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                  : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
              }
            >
              {contractSigned ? t("signed") : t("pendingSignature")}
            </span>
          </div>
        )}

        {blobConfigured && alliance && <AllianceDocumentUploader allianceId={alliance.id} />}

        {allianceDocs.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {allianceDocs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 p-4">
                <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{doc.fileName}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  render={<a href={`/api/alliance-documents/${doc.id}/file?download=1`} title={t("download")} />}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-foreground">{t("linkedReferralsLabel")}</h4>
          {linkedReferrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noLinkedReferralsInline")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
              {linkedReferrals.map((referral) => (
                <li key={referral.id} className="p-3">
                  <button
                    type="button"
                    onClick={() => setView({ level: "referral-docs", referralId: referral.id })}
                    className="text-sm font-medium text-foreground hover:underline"
                  >
                    R-{String(referral.referralSeq).padStart(3, "0")} — {referral.clientName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (view.level === "referral-docs") {
    const referral = referrals.find((r) => r.id === view.referralId);
    const referralDocs = documents.filter((d) => d.referralId === view.referralId);

    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb
          items={[
            { label: t("backToDrawers"), onClick: () => setView({ level: "drawers" }) },
            { label: tDrawer("referidos"), onClick: () => setView({ level: "referrals" }) },
            {
              label: referral ? `R-${String(referral.referralSeq).padStart(3, "0")} — ${referral.clientName}` : "",
            },
          ]}
        />

        {blobConfigured && referral && (
          <DocumentUploader clientId={referral.clientId} referralId={referral.id} defaultCategory="contracts" />
        )}

        <CabinetDocumentList documents={referralDocs} groupByImmigrationFolder={false} emptyMessage={t("empty")} />
      </div>
    );
  }

  // view.level === "otros"
  const otrosDocs = documents.filter((d) => folderOf(d) === "otros");
  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: t("backToDrawers"), onClick: () => setView({ level: "drawers" }) },
          { label: tDrawer("otros") },
        ]}
      />
      <p className="text-sm text-muted-foreground">{t("otrosDrawerHint")}</p>
      <CabinetDocumentList documents={otrosDocs} groupByImmigrationFolder={false} emptyMessage={t("empty")} showClientName />
    </div>
  );
}

function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {item.onClick ? (
            <button type="button" onClick={item.onClick} className="hover:text-foreground hover:underline">
              {item.label}
            </button>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function StudentEnrollments({ enrollments }: { enrollments: AcademyEnrollmentRow[] }) {
  const t = useTranslations("Documents");
  const tStatus = useTranslations("AcademyCaseStatus");

  if (enrollments.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium text-foreground">{t("enrolledCourses")}</h4>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
        {enrollments.map((e) => (
          <li key={e.caseId} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span className="font-medium text-foreground">
              {[e.program, e.course].filter(Boolean).join(" — ") || e.title}
            </span>
            <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="outline">{tStatus(e.status)}</Badge>
              <span>
                {t("startDate")}: {e.enrollmentDate ? formatDate(e.enrollmentDate) : "—"}
              </span>
              <span>
                {t("endDate")}:{" "}
                {e.certificateDate
                  ? formatDate(e.certificateDate)
                  : e.dueDate
                    ? `${t("targetDate")} ${formatDate(e.dueDate)}`
                    : "—"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Uploading inside a folder files the document there: a service folder
// passes that service (and the case, when the client has one or more cases
// of it); the Clients folder passes none.
function ClientDocUploader({
  clientId,
  drawer,
  matchingCases,
  showFolderSelect,
}: {
  clientId: string;
  drawer: ServiceFolder | "clientes";
  matchingCases: CaseOption[];
  showFolderSelect: boolean;
}) {
  const [selectedCaseId, setSelectedCaseId] = useState(matchingCases[0]?.id);
  const serviceFolder = drawer === "clientes" ? null : drawer;

  if (matchingCases.length <= 1) {
    return (
      <DocumentUploader
        clientId={clientId}
        caseId={matchingCases[0]?.id}
        serviceFolder={serviceFolder}
        showFolderSelect={showFolderSelect}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        value={selectedCaseId}
        onChange={(e) => setSelectedCaseId(e.target.value)}
        className="h-9 w-fit rounded-md border border-input bg-background px-2 text-sm"
      >
        {matchingCases.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <DocumentUploader
        clientId={clientId}
        caseId={selectedCaseId}
        serviceFolder={serviceFolder}
        showFolderSelect={showFolderSelect}
      />
    </div>
  );
}

function CabinetDocumentList({
  documents,
  groupByImmigrationFolder,
  emptyMessage,
  showClientName,
}: {
  documents: DocumentRow[];
  groupByImmigrationFolder: boolean;
  emptyMessage: string;
  showClientName?: boolean;
}) {
  const t = useTranslations("Documents");
  const tCategory = useTranslations("DocumentCategory");
  const tFolder = useTranslations("ImmigrationDocumentFolder");

  if (documents.length === 0) {
    return <p className="text-muted-foreground">{emptyMessage}</p>;
  }

  function Row({ doc }: { doc: DocumentRow }) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 p-4">
        <a
          href={viewHref(doc.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 items-center gap-2 font-medium text-foreground hover:underline"
        >
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{doc.fileName}</span>
        </a>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {showClientName && <span>{doc.clientName}</span>}
          {doc.uploadedByClient && <Badge variant="secondary">{t("uploadedByClient")}</Badge>}
          {doc.sensitiveDataReason && <Badge variant="destructive">{t("mayContainSensitiveData")}</Badge>}
          {doc.documentType && <span>{doc.documentType}</span>}
          {doc.category && <span className="text-xs">{tCategory(doc.category)}</span>}
          <DocumentStatusPill status={doc.status} />
          <span>{formatDate(doc.createdAt)}</span>
          {!doc.folder && <MoveCategorySelect documentId={doc.id} category={doc.category} />}
          {!doc.referralId && (
            <MoveServiceFolderSelect documentId={doc.id} current={folderOf(doc)} hasCase={Boolean(doc.caseId)} />
          )}
          <Button variant="ghost" size="icon-xs" render={<a href={downloadHref(doc.id)} title={t("download")} />}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </li>
    );
  }

  if (!groupByImmigrationFolder) {
    return (
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
        {documents.map((doc) => (
          <Row key={doc.id} doc={doc} />
        ))}
      </ul>
    );
  }

  const unfiled = documents.filter((doc) => !doc.folder);
  return (
    <div className="flex flex-col gap-4">
      {immigrationDocumentFolderValues.map((folder) => {
        const folderDocs = documents.filter((doc) => doc.folder === folder);
        if (folderDocs.length === 0) return null;
        return (
          <div key={folder} className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-foreground">{tFolder(folder)}</h4>
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
              {folderDocs.map((doc) => (
                <Row key={doc.id} doc={doc} />
              ))}
            </ul>
          </div>
        );
      })}
      {unfiled.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-foreground">{t("unfiled")}</h4>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {unfiled.map((doc) => (
              <Row key={doc.id} doc={doc} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

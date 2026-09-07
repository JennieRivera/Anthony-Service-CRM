"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Stamp,
  Landmark,
  Calculator,
  Globe,
  CreditCard,
  Briefcase,
  Building2,
  GraduationCap,
  Megaphone,
  Users,
  Handshake,
  Shield,
  FolderOpen,
  FileText,
  ChevronRight,
  Folder,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentStatusPill } from "@/components/documents/StatusPill";
import { viewHref, downloadHref } from "@/components/documents/downloadHref";
import { MoveCategorySelect } from "@/components/documents/MoveCategorySelect";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import {
  drawerValues,
  drawerColor,
  SERVICE_TYPE_TO_DRAWER,
  type Drawer,
} from "@/lib/validation/documentDrawer";
import { immigrationDocumentFolderValues } from "@/lib/validation/immigrationDocumentFolder";
import { AllianceDocumentUploader } from "@/components/alliances/AllianceDocumentUploader";
import type { listAllDocuments, listReferralsForFolders } from "@/lib/queries/documents";
import type { listAlliances, listAllianceDocuments } from "@/lib/queries/alliances";
import type { serviceTypeValues } from "@/lib/validation/client";

type ServiceType = (typeof serviceTypeValues)[number];
type DocumentRow = Awaited<ReturnType<typeof listAllDocuments>>[number];
type ReferralFolder = Awaited<ReturnType<typeof listReferralsForFolders>>[number];
type AllianceRow = Awaited<ReturnType<typeof listAlliances>>[number];
type AllianceDocRow = Awaited<ReturnType<typeof listAllianceDocuments>>[number];
type ClientOption = { id: string; fullName: string; folderNumber: string | null };
type CaseOption = { id: string; title: string; clientId: string; serviceType: ServiceType };

const DRAWER_ICONS: Record<Drawer, typeof Stamp> = {
  notaria: Stamp,
  impuestos: Landmark,
  bookkeeping: Calculator,
  inmigracion: Globe,
  credito: CreditCard,
  consultoria: Briefcase,
  formacion: Building2,
  academia: GraduationCap,
  marketing: Megaphone,
  seguros: Shield,
  clientes: Users,
  referidos: Handshake,
  otros: FolderOpen,
};

function computeDrawer(doc: DocumentRow): Drawer | null {
  if (doc.referralId) return "referidos";
  if (doc.folder) return "inmigracion";
  if (doc.serviceType) return SERVICE_TYPE_TO_DRAWER[doc.serviceType];
  if (doc.category === "other") return "otros";
  return null;
}

function folderLabel(number: string | null, name: string): string {
  return number ? `${number} — ${name}` : name;
}

type View =
  | { level: "drawers" }
  | { level: "clients"; drawer: Drawer }
  | { level: "client-docs"; drawer: Drawer; clientId: string }
  | { level: "referrals" }
  | { level: "referral-docs"; referralId: string }
  | { level: "alliances" }
  | { level: "alliance-docs"; allianceId: string }
  | { level: "otros" };

export function DocumentsCabinet({
  documents,
  clients,
  cases,
  referrals,
  alliances,
  allianceDocuments,
  blobConfigured,
}: {
  documents: DocumentRow[];
  clients: ClientOption[];
  cases: CaseOption[];
  referrals: ReferralFolder[];
  alliances: AllianceRow[];
  allianceDocuments: AllianceDocRow[];
  blobConfigured: boolean;
}) {
  const t = useTranslations("Documents");
  const tDrawer = useTranslations("DocumentDrawer");
  const [view, setView] = useState<View>({ level: "drawers" });

  const drawerCounts = useMemo(() => {
    const map = new Map<Drawer, number>();
    for (const doc of documents) {
      const drawer = computeDrawer(doc);
      if (drawer) map.set(drawer, (map.get(drawer) ?? 0) + 1);
    }
    map.set("clientes", documents.length);
    map.set("referidos", (map.get("referidos") ?? 0) + allianceDocuments.length);
    return map;
  }, [documents, allianceDocuments]);

  if (view.level === "drawers") {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {drawerValues.map((drawer) => {
          const Icon = DRAWER_ICONS[drawer];
          return (
            <button
              key={drawer}
              type="button"
              onClick={() =>
                setView(
                  drawer === "referidos"
                    ? { level: "referrals" }
                    : drawer === "otros"
                      ? { level: "otros" }
                      : { level: "clients", drawer },
                )
              }
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-foreground/30"
              style={{ borderTopWidth: 4, borderTopColor: drawerColor(drawer) }}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5" style={{ color: drawerColor(drawer) }} />
                <span className="text-xs text-muted-foreground">
                  {drawerCounts.get(drawer) ?? 0}
                </span>
              </div>
              <span className="font-heading text-base text-foreground">
                {tDrawer(drawer)}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (view.level === "clients") {
    const { drawer } = view;
    const clientIds =
      drawer === "clientes"
        ? clients.map((c) => c.id)
        : Array.from(
            new Set(
              cases
                .filter((c) => SERVICE_TYPE_TO_DRAWER[c.serviceType] === drawer)
                .map((c) => c.clientId),
            ),
          );
    const folderClients = clients.filter((c) => clientIds.includes(c.id));

    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb
          items={[
            { label: t("backToDrawers"), onClick: () => setView({ level: "drawers" }) },
            { label: tDrawer(drawer) },
          ]}
        />
        {folderClients.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            {t("noClientsInDrawer")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {folderClients.map((client) => {
              const count = documents.filter(
                (d) =>
                  d.clientId === client.id &&
                  (drawer === "clientes" ? true : computeDrawer(d) === drawer),
              ).length;
              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setView({ level: "client-docs", drawer, clientId: client.id })}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-4 text-left hover:border-foreground/30"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Folder className="h-4 w-4 shrink-0" style={{ color: drawerColor(drawer) }} />
                    <span className="truncate text-sm font-medium text-foreground">
                      {folderLabel(client.folderNumber, client.fullName)}
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

  if (view.level === "client-docs") {
    const { drawer, clientId } = view;
    const client = clients.find((c) => c.id === clientId);
    const clientDocs = documents.filter(
      (d) => d.clientId === clientId && (drawer === "clientes" ? true : computeDrawer(d) === drawer),
    );
    const matchingCases = cases.filter(
      (c) => c.clientId === clientId && (drawer === "clientes" || SERVICE_TYPE_TO_DRAWER[c.serviceType] === drawer),
    );
    const isImmigration = drawer === "inmigracion";

    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb
          items={[
            { label: t("backToDrawers"), onClick: () => setView({ level: "drawers" }) },
            { label: tDrawer(drawer), onClick: () => setView({ level: "clients", drawer }) },
            { label: client ? folderLabel(client.folderNumber, client.fullName) : "" },
          ]}
        />

        {blobConfigured && (
          <ClientDocUploader
            clientId={clientId}
            matchingCases={matchingCases}
            showFolderSelect={isImmigration}
          />
        )}

        <CabinetDocumentList
          documents={clientDocs}
          groupByImmigrationFolder={isImmigration}
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
        <div className="flex gap-2">
          <Button variant="default" size="sm" disabled>
            {t("byReferredClient")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setView({ level: "alliances" })}>
            {t("byAlliance")}
          </Button>
        </div>
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
                  <span className="flex items-center gap-2 min-w-0">
                    <Folder className="h-4 w-4 shrink-0" style={{ color: drawerColor("referidos") }} />
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
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb
          items={[
            { label: t("backToDrawers"), onClick: () => setView({ level: "drawers" }) },
            { label: tDrawer("referidos"), onClick: () => setView({ level: "referrals" }) },
          ]}
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView({ level: "referrals" })}>
            {t("byReferredClient")}
          </Button>
          <Button variant="default" size="sm" disabled>
            {t("byAlliance")}
          </Button>
        </div>
        {alliances.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            {t("noAlliancesLinked")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alliances.map((alliance) => {
              const count =
                referrals.filter((r) => r.allianceId === alliance.id).length +
                allianceDocuments.filter((d) => d.allianceId === alliance.id).length;
              return (
                <button
                  key={alliance.id}
                  type="button"
                  onClick={() => setView({ level: "alliance-docs", allianceId: alliance.id })}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-4 text-left hover:border-foreground/30"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Folder className="h-4 w-4 shrink-0" style={{ color: drawerColor("referidos") }} />
                    <span className="truncate text-sm font-medium text-foreground">
                      {alliance.organizationName}
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
            { label: tDrawer("referidos"), onClick: () => setView({ level: "referrals" }) },
            { label: t("byAlliance"), onClick: () => setView({ level: "alliances" }) },
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
                  render={
                    <a
                      href={`/api/alliance-documents/${doc.id}/file?download=1`}
                      title={t("download")}
                    />
                  }
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
              label: referral
                ? `R-${String(referral.referralSeq).padStart(3, "0")} — ${referral.clientName}`
                : "",
            },
          ]}
        />

        {blobConfigured && referral && (
          <DocumentUploader
            clientId={referral.clientId}
            referralId={referral.id}
            defaultCategory="contracts"
          />
        )}

        <CabinetDocumentList
          documents={referralDocs}
          groupByImmigrationFolder={false}
          emptyMessage={t("empty")}
        />
      </div>
    );
  }

  // view.level === "otros"
  const otrosDocs = documents.filter((d) => computeDrawer(d) === "otros");
  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: t("backToDrawers"), onClick: () => setView({ level: "drawers" }) },
          { label: tDrawer("otros") },
        ]}
      />
      <p className="text-sm text-muted-foreground">{t("otrosDrawerHint")}</p>
      <CabinetDocumentList
        documents={otrosDocs}
        groupByImmigrationFolder={false}
        emptyMessage={t("empty")}
        showClientName
      />
    </div>
  );
}

function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
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

function ClientDocUploader({
  clientId,
  matchingCases,
  showFolderSelect,
}: {
  clientId: string;
  matchingCases: CaseOption[];
  showFolderSelect: boolean;
}) {
  const [selectedCaseId, setSelectedCaseId] = useState(matchingCases[0]?.id);

  if (matchingCases.length <= 1) {
    return (
      <DocumentUploader
        clientId={clientId}
        caseId={matchingCases[0]?.id}
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
          {doc.documentType && <span>{doc.documentType}</span>}
          {doc.category && <span className="text-xs">{tCategory(doc.category)}</span>}
          <DocumentStatusPill status={doc.status} />
          <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
          {!doc.folder && <MoveCategorySelect documentId={doc.id} category={doc.category} />}
          <Button
            variant="ghost"
            size="icon-xs"
            render={<a href={downloadHref(doc.id)} title={t("download")} />}
          >
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

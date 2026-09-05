import {
  Users,
  DollarSign,
  Briefcase,
  Receipt,
  Handshake,
  CircleDollarSign,
  MessagesSquare,
  MessageCircle,
  GraduationCap,
  Network,
  Building2,
  Map,
  Landmark,
  AlertTriangle,
  FileBadge,
  FileBadge2,
  FileStack,
  MapPinned,
  UsersRound,
  TrendingUp,
  ClockAlert,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getDashboardData } from "@/lib/queries/dashboard";
import { getPhase5DashboardData } from "@/lib/queries/phase5Dashboard";
import { getDataFreshnessAlerts } from "@/lib/queries/dataFreshness";
import { listActiveProfessionalSystems } from "@/lib/queries/professionalSystems";
import { listActiveWebsiteLinks } from "@/lib/queries/websiteLinks";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ServiceBreakdownChart } from "@/components/dashboard/ServiceBreakdownChart";
import { ClientGrowthChart } from "@/components/dashboard/ClientGrowthChart";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ActionNeededList } from "@/components/dashboard/ActionNeededList";
import { FollowUpTasksCard } from "@/components/dashboard/FollowUpTasksCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ProfessionalSystemsSection } from "@/components/dashboard/ProfessionalSystemsSection";
import { MyWebsitesSection } from "@/components/dashboard/MyWebsitesSection";
import { AiAgentsCard } from "@/components/dashboard/AiAgentsCard";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default async function Home() {
  const t = await getTranslations("Dashboard");
  const configured = isDatabaseConfigured();

  if (!configured) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <DatabaseNotConfigured />
      </div>
    );
  }

  const [data, phase5, freshnessAlerts, professionalSystems, websites] =
    await Promise.all([
      getDashboardData(),
      getPhase5DashboardData(),
      getDataFreshnessAlerts(),
      listActiveProfessionalSystems(),
      listActiveWebsiteLinks(),
    ]);
  const { kpis } = data;

  return (
    <div className="flex w-full flex-col gap-8 px-8 py-10">
      <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>

      {/* 1. Business Summary */}
      <DashboardSection title={t("sectionBusinessSummary")}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard
              label={t("activeClients")}
              value={String(kpis.activeClients)}
              icon={Users}
            />
            <KpiCard
              label={t("openCases")}
              value={String(kpis.openCases)}
              icon={Briefcase}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ClientGrowthChart data={data.clientGrowth} />
            </div>
            <ServiceBreakdownChart data={data.serviceBreakdown} />
          </div>
          <RecentActivity items={data.activity} />
        </div>
      </DashboardSection>

      {/* 2. Financial Summary */}
      <DashboardSection title={t("sectionFinancialSummary")}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard
              label={t("revenueThisMonth")}
              value={formatMoney(kpis.revenueThisMonth)}
              icon={DollarSign}
              trend={{
                value: `${kpis.revenueChangePct >= 0 ? "+" : ""}${kpis.revenueChangePct.toFixed(0)}% ${t("vsLastMonth")}`,
                positive: kpis.revenueChangePct >= 0,
              }}
            />
            <KpiCard
              label={t("outstandingInvoices")}
              value={formatMoney(kpis.outstandingTotal)}
              icon={Receipt}
              trend={{
                value: `${kpis.outstandingInvoicesCount}`,
                positive: false,
              }}
            />
          </div>
          <RevenueChart series={data.revenueSeries} />
        </div>
      </DashboardSection>

      {/* 3. Tasks & Follow-Ups */}
      <DashboardSection title={t("sectionTasksFollowUps")} viewAllHref="/tasks" viewAllLabel={t("viewAll")}>
        <div className="grid gap-4 lg:grid-cols-3">
          <FollowUpTasksCard tasks={data.followUpTasks} />
          <ActionNeededList
            overdueInvoices={data.actionNeeded.overdueInvoices}
            stalledCases={data.actionNeeded.stalledCases}
          />
          <UpcomingAppointments appointments={data.upcomingAppointments} />
        </div>
      </DashboardSection>

      {/* 4. Referrals */}
      <DashboardSection title={t("sectionReferrals")} viewAllHref="/referrals" viewAllLabel={t("viewAll")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard
            label={t("openReferrals")}
            value={String(data.referralsSummary.openCount)}
            icon={Handshake}
          />
          <KpiCard
            label={t("commissionDue")}
            value={formatMoney(data.referralsSummary.commissionDueTotal)}
            icon={CircleDollarSign}
          />
        </div>
      </DashboardSection>

      {/* 5. Communications */}
      <DashboardSection title={t("sectionCommunications")} viewAllHref="/communications" viewAllLabel={t("viewAll")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard
            label={t("pendingFollowUpComms")}
            value={String(data.communicationsSummary.pendingFollowUp)}
            icon={MessagesSquare}
          />
          <KpiCard
            label={t("unreadComms")}
            value={String(data.communicationsSummary.unread)}
            icon={MessageCircle}
          />
        </div>
      </DashboardSection>

      {/* 6. My Professional Systems */}
      <ProfessionalSystemsSection systems={professionalSystems} />

      {/* 7. My Websites */}
      <MyWebsitesSection websites={websites} />

      {/* 8. Academy */}
      <DashboardSection title={t("sectionAcademy")} viewAllHref="/cases" viewAllLabel={t("viewAll")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard
            label={t("activeAcademyStudents")}
            value={String(data.academySummary.activeCount)}
            icon={GraduationCap}
          />
        </div>
      </DashboardSection>

      {/* 9. Community */}
      <DashboardSection title={t("sectionCommunity")} viewAllHref="/alliances" viewAllLabel={t("viewAll")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard
            label={t("activeAlliances")}
            value={String(data.communitySummary.activeAlliances)}
            icon={Network}
          />
        </div>
      </DashboardSection>

      {/* 10. Business Expansion (Phase 5) */}
      <DashboardSection title={t("sectionBusinessExpansion")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t("companiesRegistered")}
            value={String(phase5.companiesRegistered)}
            icon={Building2}
          />
          <KpiCard
            label={t("companiesByState")}
            value={String(phase5.companiesByStateCount)}
            icon={Map}
          />
          <KpiCard
            label={t("salesTaxCases")}
            value={String(phase5.salesTaxCases)}
            icon={Landmark}
          />
          <KpiCard
            label={t("salesTaxDue")}
            value={String(phase5.salesTaxDue)}
            icon={AlertTriangle}
          />
          <KpiCard
            label={t("einCases")}
            value={String(phase5.einCases)}
            icon={FileBadge}
          />
          <KpiCard
            label={t("itinCases")}
            value={String(phase5.itinCases)}
            icon={FileBadge2}
          />
          <KpiCard
            label={t("immigrationCases")}
            value={String(phase5.immigrationCases)}
            icon={FileStack}
          />
          <KpiCard
            label={t("latinoBusinessOpportunities")}
            value={String(phase5.latinoBusinessOpportunities)}
            icon={MapPinned}
          />
          <KpiCard
            label={t("activeAssociations")}
            value={String(phase5.activeAssociations)}
            icon={UsersRound}
          />
          <KpiCard
            label={t("strategicChambers")}
            value={String(phase5.strategicChambers)}
            icon={Landmark}
          />
          <KpiCard
            label={t("expansionStates")}
            value={String(phase5.expansionStates)}
            icon={TrendingUp}
          />
          <KpiCard
            label={t("companyComplianceAlerts")}
            value={String(phase5.companyComplianceAlerts)}
            icon={AlertTriangle}
          />
        </div>
      </DashboardSection>

      {/* 11. Data Freshness (Phase 5) */}
      {freshnessAlerts.length > 0 && (
        <DashboardSection title={t("sectionDataFreshness")}>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              {t("dataFreshnessSummary", { count: freshnessAlerts.length })}
            </p>
            <div className="flex flex-col gap-2">
              {freshnessAlerts.slice(0, 8).map((alert, index) => (
                <Link
                  key={`${alert.module}-${index}`}
                  href={alert.href}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <ClockAlert className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{alert.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {alert.lastVerifiedDate
                      ? new Date(alert.lastVerifiedDate).toLocaleDateString()
                      : t("neverVerified")}
                  </span>
                </Link>
              ))}
            </div>
            {freshnessAlerts.length > 8 && (
              <p className="text-xs text-muted-foreground">
                {t("dataFreshnessMore", { count: freshnessAlerts.length - 8 })}
              </p>
            )}
          </div>
        </DashboardSection>
      )}

      {/* 12. AI Agents */}
      <DashboardSection title={t("sectionAiAgents")}>
        <AiAgentsCard />
      </DashboardSection>
    </div>
  );
}

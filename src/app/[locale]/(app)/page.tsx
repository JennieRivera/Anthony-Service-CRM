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
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getDashboardData } from "@/lib/queries/dashboard";
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

  const [data, professionalSystems, websites] = await Promise.all([
    getDashboardData(),
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

      {/* 10. AI Agents */}
      <DashboardSection title={t("sectionAiAgents")}>
        <AiAgentsCard />
      </DashboardSection>
    </div>
  );
}

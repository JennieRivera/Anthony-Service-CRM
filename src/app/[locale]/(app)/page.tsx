import { Users, DollarSign, Briefcase, Receipt } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getDashboardData } from "@/lib/queries/dashboard";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ServiceBreakdownChart } from "@/components/dashboard/ServiceBreakdownChart";
import { ClientGrowthChart } from "@/components/dashboard/ClientGrowthChart";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ActionNeededList } from "@/components/dashboard/ActionNeededList";

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

  const data = await getDashboardData();
  const { kpis } = data;

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("activeClients")}
          value={String(kpis.activeClients)}
          icon={Users}
        />
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
          label={t("openCases")}
          value={String(kpis.openCases)}
          icon={Briefcase}
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart series={data.revenueSeries} />
        </div>
        <ServiceBreakdownChart data={data.serviceBreakdown} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClientGrowthChart data={data.clientGrowth} />
        </div>
        <UpcomingAppointments appointments={data.upcomingAppointments} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentActivity items={data.activity} />
        <ActionNeededList
          overdueInvoices={data.actionNeeded.overdueInvoices}
          stalledCases={data.actionNeeded.stalledCases}
        />
      </div>
    </div>
  );
}

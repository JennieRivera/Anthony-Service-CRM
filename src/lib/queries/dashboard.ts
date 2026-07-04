import { getDb } from "@/lib/db";
import { clients, cases, invoices, documents } from "@/lib/db/schema";
import { listUpcomingAppointments } from "./appointments";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function weekKey(d: Date) {
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function getDashboardData() {
  const db = getDb();

  const [allClients, allCases, allInvoices, allDocuments, upcoming] =
    await Promise.all([
      db.select().from(clients),
      db.select().from(cases),
      db.select().from(invoices),
      db.select().from(documents),
      listUpcomingAppointments(5),
    ]);

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const paidInvoices = allInvoices.filter(
    (inv) => inv.status === "paid" && inv.paidAt,
  );

  const revenueThisMonth = paidInvoices
    .filter((inv) => new Date(inv.paidAt!) >= startOfThisMonth)
    .reduce((sum, inv) => sum + Number(inv.total), 0);

  const revenueLastMonth = paidInvoices
    .filter(
      (inv) =>
        new Date(inv.paidAt!) >= startOfLastMonth &&
        new Date(inv.paidAt!) < startOfThisMonth,
    )
    .reduce((sum, inv) => sum + Number(inv.total), 0);

  const revenueChangePct =
    revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
      : revenueThisMonth > 0
        ? 100
        : 0;

  const activeClients = allClients.filter((c) =>
    ["active", "in_progress"].includes(c.status),
  ).length;

  const openCases = allCases.filter(
    (c) => !["completed", "cancelled"].includes(c.status),
  ).length;

  const outstandingInvoices = allInvoices.filter((inv) =>
    ["unpaid", "overdue"].includes(inv.status),
  );
  const outstandingTotal = outstandingInvoices.reduce(
    (sum, inv) => sum + Number(inv.total),
    0,
  );

  // Revenue series: last 12 months, last 12 weeks, last 5 years
  const monthlyBuckets = new Map<string, number>();
  const weeklyBuckets = new Map<string, number>();
  const yearlyBuckets = new Map<string, number>();

  for (const inv of paidInvoices) {
    const d = new Date(inv.paidAt!);
    const amount = Number(inv.total);
    monthlyBuckets.set(
      monthKey(d),
      (monthlyBuckets.get(monthKey(d)) ?? 0) + amount,
    );
    weeklyBuckets.set(
      weekKey(d),
      (weeklyBuckets.get(weekKey(d)) ?? 0) + amount,
    );
    const y = String(d.getFullYear());
    yearlyBuckets.set(y, (yearlyBuckets.get(y) ?? 0) + amount);
  }

  function lastNMonths(n: number) {
    const result: { period: string; revenue: number }[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      result.push({ period: key, revenue: monthlyBuckets.get(key) ?? 0 });
    }
    return result;
  }

  function lastNWeeks(n: number) {
    const result: { period: string; revenue: number }[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 7 * 86400000);
      const key = weekKey(d);
      result.push({ period: key, revenue: weeklyBuckets.get(key) ?? 0 });
    }
    return result;
  }

  function lastNYears(n: number) {
    const result: { period: string; revenue: number }[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const key = String(now.getFullYear() - i);
      result.push({ period: key, revenue: yearlyBuckets.get(key) ?? 0 });
    }
    return result;
  }

  const revenueSeries = {
    weekly: lastNWeeks(12),
    monthly: lastNMonths(12),
    yearly: lastNYears(5),
  };

  // Client growth: new clients per month, last 12 months
  const clientsByMonth = new Map<string, number>();
  for (const c of allClients) {
    const key = monthKey(new Date(c.createdAt));
    clientsByMonth.set(key, (clientsByMonth.get(key) ?? 0) + 1);
  }
  const clientGrowth = Array.from({ length: 12 }, (_, idx) => {
    const i = 11 - idx;
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    return { period: key, newClients: clientsByMonth.get(key) ?? 0 };
  });

  // Service breakdown: case count per service type
  const serviceCounts = new Map<string, number>();
  for (const c of allCases) {
    serviceCounts.set(
      c.serviceType,
      (serviceCounts.get(c.serviceType) ?? 0) + 1,
    );
  }
  const serviceBreakdown = Array.from(serviceCounts.entries()).map(
    ([serviceType, count]) => ({ serviceType, count }),
  );

  // Recent activity: merge recent clients, cases, invoices(paid), documents
  type ActivityItem = {
    id: string;
    type: "client" | "case" | "invoice" | "document";
    label: string;
    timestamp: Date;
  };

  const activity: ActivityItem[] = [
    ...allClients.map((c) => ({
      id: c.id,
      type: "client" as const,
      label: c.fullName,
      timestamp: new Date(c.createdAt),
    })),
    ...allCases.map((c) => ({
      id: c.id,
      type: "case" as const,
      label: c.title,
      timestamp: new Date(c.updatedAt),
    })),
    ...paidInvoices.map((inv) => ({
      id: inv.id,
      type: "invoice" as const,
      label: `INV-${String(inv.invoiceSeq).padStart(5, "0")}`,
      timestamp: new Date(inv.paidAt!),
    })),
    ...allDocuments.map((d) => ({
      id: d.id,
      type: "document" as const,
      label: d.fileName,
      timestamp: new Date(d.createdAt),
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8);

  // Action needed: overdue invoices + stalled cases (waiting_on_client)
  const overdueInvoices = allInvoices.filter(
    (inv) =>
      inv.status === "overdue" ||
      (inv.status === "unpaid" &&
        inv.dueDate &&
        new Date(inv.dueDate) < now),
  );
  const stalledCases = allCases.filter(
    (c) => c.status === "waiting_on_client",
  );

  return {
    kpis: {
      activeClients,
      revenueThisMonth,
      revenueLastMonth,
      revenueChangePct,
      openCases,
      outstandingInvoicesCount: outstandingInvoices.length,
      outstandingTotal,
    },
    revenueSeries,
    clientGrowth,
    serviceBreakdown,
    upcomingAppointments: upcoming,
    activity,
    actionNeeded: {
      overdueInvoices,
      stalledCases,
    },
  };
}

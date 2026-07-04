import { getDb } from "@/lib/db";
import { clients, cases, invoices } from "@/lib/db/schema";

export async function getReportData(from: Date, to: Date) {
  const db = getDb();

  const [allClients, allCases, allInvoices] = await Promise.all([
    db.select().from(clients),
    db.select().from(cases),
    db.select().from(invoices),
  ]);

  const inRange = (d: Date) => d >= from && d <= to;

  const clientsInRange = allClients.filter((c) =>
    inRange(new Date(c.createdAt)),
  );

  const casesInRange = allCases.filter((c) => inRange(new Date(c.createdAt)));

  const paidInvoicesInRange = allInvoices.filter(
    (inv) => inv.status === "paid" && inv.paidAt && inRange(new Date(inv.paidAt)),
  );

  // Revenue by service type: join paid invoices to their case's service type
  // when available; invoices without a case are grouped as "unassigned".
  const casesById = new Map(allCases.map((c) => [c.id, c]));
  const revenueByService = new Map<string, number>();
  for (const inv of paidInvoicesInRange) {
    const serviceType = inv.caseId
      ? (casesById.get(inv.caseId)?.serviceType ?? "unassigned")
      : "unassigned";
    revenueByService.set(
      serviceType,
      (revenueByService.get(serviceType) ?? 0) + Number(inv.total),
    );
  }

  const totalRevenue = paidInvoicesInRange.reduce(
    (sum, inv) => sum + Number(inv.total),
    0,
  );

  // Average case turnaround: days between createdAt and updatedAt for
  // completed cases created in range (updatedAt is a proxy for completion
  // time since we don't track a dedicated completedAt column).
  const completedCases = casesInRange.filter((c) => c.status === "completed");
  const turnaroundDays = completedCases.map(
    (c) =>
      (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) /
      86400000,
  );
  const avgTurnaroundDays =
    turnaroundDays.length > 0
      ? turnaroundDays.reduce((a, b) => a + b, 0) / turnaroundDays.length
      : null;

  // Seasonality: case volume by calendar month across all-time data.
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const seasonality = monthNames.map((label, idx) => ({
    month: label,
    count: allCases.filter((c) => new Date(c.createdAt).getMonth() === idx)
      .length,
  }));

  return {
    revenueByService: Array.from(revenueByService.entries()).map(
      ([serviceType, revenue]) => ({ serviceType, revenue }),
    ),
    totalRevenue,
    newClients: clientsInRange.length,
    newCases: casesInRange.length,
    avgTurnaroundDays,
    seasonality,
  };
}

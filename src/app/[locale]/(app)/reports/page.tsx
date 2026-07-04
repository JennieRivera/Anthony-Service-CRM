import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getReportData } from "@/lib/queries/reports";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import { DateRangeForm } from "@/components/reports/DateRangeForm";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { SeasonalityChart } from "@/components/reports/SeasonalityChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const t = await getTranslations("Reports");
  const tService = await getTranslations("ServiceType");
  const configured = isDatabaseConfigured();
  const defaults = defaultRange();
  const { from = defaults.from, to = defaults.to } = await searchParams;

  if (!configured) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <DatabaseNotConfigured />
      </div>
    );
  }

  const toDateEnd = new Date(to);
  toDateEnd.setHours(23, 59, 59, 999);
  const data = await getReportData(new Date(from), toDateEnd);

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <ExportButtons
          revenueByService={data.revenueByService}
          from={from}
          to={to}
        />
      </div>

      <DateRangeForm from={from} to={to} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("totalRevenue")}
            </CardTitle>
          </CardHeader>
          <CardContent className="font-heading text-2xl text-foreground">
            {formatMoney(data.totalRevenue)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("newClients")}
            </CardTitle>
          </CardHeader>
          <CardContent className="font-heading text-2xl text-foreground">
            {data.newClients}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("newCases")}
            </CardTitle>
          </CardHeader>
          <CardContent className="font-heading text-2xl text-foreground">
            {data.newCases}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("avgTurnaround")}
            </CardTitle>
          </CardHeader>
          <CardContent className="font-heading text-2xl text-foreground">
            {data.avgTurnaroundDays !== null
              ? `${data.avgTurnaroundDays.toFixed(1)} ${t("days")}`
              : t("notAvailable")}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("revenueByService")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnService")}</TableHead>
                  <TableHead>{t("columnRevenue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.revenueByService.map((row) => (
                  <TableRow key={row.serviceType}>
                    <TableCell>
                      {row.serviceType === "unassigned"
                        ? row.serviceType
                        : tService(row.serviceType)}
                    </TableCell>
                    <TableCell>{formatMoney(row.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <SeasonalityChart data={data.seasonality} />
      </div>
    </div>
  );
}

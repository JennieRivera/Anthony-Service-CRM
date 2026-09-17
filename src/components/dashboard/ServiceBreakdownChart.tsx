"use client";

import { Pie, PieChart, Cell } from "recharts";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

// Local to this chart only — deliberately not the shared --chart-1..5
// tokens, which src/components/reports/SeasonalityChart.tsx also reads
// directly; changing those would have silently recolored that chart too.
const COLORS = [
  "#3B6E91", // blue
  "#B8964A", // gold (brand gold, same as --sidebar-primary)
  "#4C7A5D", // green
  "#0F1A2B", // dark navy (brand navy, same as --primary)
  "#7CBCB2", // light aqua blue
  "#8C6D46",
  "#4A5A3A",
  "#6E4A6E",
];

export function ServiceBreakdownChart({
  data,
}: {
  data: { serviceType: string; count: number }[];
}) {
  const t = useTranslations("Dashboard");
  const tService = useTranslations("ServiceType");

  const chartConfig: ChartConfig = Object.fromEntries(
    data.map((d, i) => [
      d.serviceType,
      { label: tService(d.serviceType), color: COLORS[i % COLORS.length] },
    ]),
  );

  const chartData = data.map((d, i) => ({
    ...d,
    label: tService(d.serviceType),
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("serviceBreakdown")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-72 w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="label"
              innerRadius={60}
              outerRadius={100}
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.serviceType} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="label" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

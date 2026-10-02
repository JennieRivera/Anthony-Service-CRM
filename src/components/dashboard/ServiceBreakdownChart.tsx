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
// Final visual correction — replaced the pre-Phase-1.5D navy/gold palette
// with the approved brand family (Soft Blue, Sky Blue, Sage, Champagne
// Gold), largest-to-smallest slice bias toward the most "primary" tones.
const COLORS = [
  "#477297", // Professional Soft Blue (deepened, matches --primary)
  "#C8A96B", // Champagne Gold (literal brand gold)
  "#5B7664", // Sage Green (deepened, matches --success)
  "#78B7D0", // Elegant Sky Blue (literal)
  "#847047", // Champagne Gold (deepened, matches --premium)
  "#3E7A74", // supporting teal
  "#4F7FA8", // Professional Soft Blue (literal)
  "#8FB89C", // supporting soft green
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

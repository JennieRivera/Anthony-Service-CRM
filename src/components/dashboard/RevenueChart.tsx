"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const chartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--accent)",
  },
};

export function RevenueChart({
  series,
}: {
  series: {
    weekly: { period: string; revenue: number }[];
    monthly: { period: string; revenue: number }[];
    yearly: { period: string; revenue: number }[];
  };
}) {
  const t = useTranslations("Dashboard");
  const [range, setRange] = useState<"weekly" | "monthly" | "yearly">(
    "monthly",
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("revenue")}</CardTitle>
        <Select
          value={range}
          onValueChange={(v) => setRange((v ?? "monthly") as typeof range)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">{t("weekly")}</SelectItem>
            <SelectItem value="monthly">{t("monthly")}</SelectItem>
            <SelectItem value="yearly">{t("yearly")}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
          <AreaChart data={series[range]}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
              width={60}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="revenue"
              type="monotone"
              fill="url(#revenueFill)"
              stroke="var(--accent)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

"use client";

import Papa from "papaparse";
import { useTranslations } from "next-intl";
import { Download, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButtons({
  revenueByService,
  from,
  to,
}: {
  revenueByService: { serviceType: string; revenue: number }[];
  from: string;
  to: string;
}) {
  const t = useTranslations("Reports");

  function handleExportCsv() {
    const csv = Papa.unparse(
      revenueByService.map((row) => ({
        service_type: row.serviceType,
        revenue: row.revenue.toFixed(2),
      })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `revenue-by-service_${from}_to_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleExportCsv}>
        <Download className="h-4 w-4" />
        {t("exportCsv")}
      </Button>
      <Button
        variant="outline"
        render={<a href={`/api/reports/pdf?from=${from}&to=${to}`} />}
      >
        <FileDown className="h-4 w-4" />
        {t("exportPdf")}
      </Button>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getReportData } from "@/lib/queries/reports";
import {
  getRevenueBillingReport,
  getRecordedPaymentsReport,
  getOutstandingInvoicesReport,
  getReferralPerformanceReport,
  getReferralCompensationReport,
  getB2BAlliancePerformanceReport,
  getMembershipFinancialReport,
} from "@/lib/queries/financialReports";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import AccessDenied from "@/components/AccessDenied";
import { getCurrentRole, getReportsVisibility } from "@/lib/permissions";
import { DateRangeForm } from "@/components/reports/DateRangeForm";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { SeasonalityChart } from "@/components/reports/SeasonalityChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addDays, businessDateString, businessLocalToUtc, formatDate } from "@/lib/dates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    from: businessDateString(from),
    to: businessDateString(to),
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; tab?: string }>;
}) {
  const t = await getTranslations("Reports");
  const tService = await getTranslations("ServiceType");
  const tCompStatus = await getTranslations("CompensationStatus");
  const tFeeType = await getTranslations("MembershipFeeType");
  const tAllianceStatus = await getTranslations("AllianceStatus");
  const tMembershipStatus = await getTranslations("AllianceMembershipStatus");
  const configured = isDatabaseConfigured();
  const defaults = defaultRange();
  const params = await searchParams;
  const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const from = isDay(params.from) ? params.from! : defaults.from;
  const to = isDay(params.to) ? params.to! : defaults.to;
  const tab = params.tab;

  if (!configured) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <DatabaseNotConfigured />
      </div>
    );
  }

  const role = await getCurrentRole();
  const visibility = role ? getReportsVisibility(role) : { full: false, referral: false, b2b: false, any: false };

  if (!role || !visibility.any) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <AccessDenied />
      </div>
    );
  }

  // Whole Florida days: from 12:00 AM on "from" to 11:59:59 PM on "to"
  // (the server runs in UTC, so new Date("YYYY-MM-DD") would be 4–5 h off).
  const fromDate = businessLocalToUtc(from);
  const toDateEnd = new Date(businessLocalToUtc(addDays(to, 1)).getTime() - 1);
  const range = { from: fromDate, to: toDateEnd };

  const [
    overviewData,
    billing,
    recordedPayments,
    outstanding,
    referralPerformance,
    referralCompensation,
    b2bPerformance,
    membershipFinancials,
  ] = await Promise.all([
    visibility.full ? getReportData(fromDate, toDateEnd) : Promise.resolve(null),
    visibility.full ? getRevenueBillingReport(range) : Promise.resolve(null),
    visibility.full ? getRecordedPaymentsReport(range) : Promise.resolve(null),
    visibility.full ? getOutstandingInvoicesReport() : Promise.resolve(null),
    visibility.referral ? getReferralPerformanceReport(range) : Promise.resolve(null),
    visibility.referral ? getReferralCompensationReport(range) : Promise.resolve(null),
    visibility.b2b ? getB2BAlliancePerformanceReport() : Promise.resolve(null),
    visibility.b2b ? getMembershipFinancialReport() : Promise.resolve(null),
  ]);

  const defaultTab = visibility.full ? "overview" : visibility.referral ? "referrals" : "b2b";
  const activeTab = tab ?? defaultTab;

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
          {/* Shows which range is loaded — changes as soon as "Apply" finishes. */}
          <p className="text-sm text-muted-foreground" data-testid="report-range">
            {t("rangeLabel", { from: formatDate(from), to: formatDate(to) })}
          </p>
        </div>
        {visibility.full && overviewData && (
          <ExportButtons
            revenueByService={overviewData.revenueByService}
            from={from}
            to={to}
          />
        )}
      </div>

      <DateRangeForm key={`${from}_${to}`} from={from} to={to} tab={tab} />

      <Tabs defaultValue={activeTab}>
        <TabsList>
          {visibility.full && <TabsTrigger value="overview">{t("tabOverview")}</TabsTrigger>}
          {visibility.full && <TabsTrigger value="billing">{t("tabBilling")}</TabsTrigger>}
          {visibility.full && <TabsTrigger value="payments">{t("tabPayments")}</TabsTrigger>}
          {visibility.full && <TabsTrigger value="outstanding">{t("tabOutstanding")}</TabsTrigger>}
          {visibility.referral && <TabsTrigger value="referrals">{t("tabReferrals")}</TabsTrigger>}
          {visibility.referral && <TabsTrigger value="compensation">{t("tabCompensation")}</TabsTrigger>}
          {visibility.b2b && <TabsTrigger value="b2b">{t("tabB2B")}</TabsTrigger>}
          {visibility.b2b && <TabsTrigger value="membership">{t("tabMembership")}</TabsTrigger>}
        </TabsList>

        {visibility.full && overviewData && (
          <TabsContent value="overview" className="flex flex-col gap-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalRevenue")}</CardTitle>
                </CardHeader>
                <CardContent className="font-heading text-2xl text-foreground">
                  {formatMoney(overviewData.totalRevenue)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("newClients")}</CardTitle>
                </CardHeader>
                <CardContent className="font-heading text-2xl text-foreground">{overviewData.newClients}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("newCases")}</CardTitle>
                </CardHeader>
                <CardContent className="font-heading text-2xl text-foreground">{overviewData.newCases}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("avgTurnaround")}</CardTitle>
                </CardHeader>
                <CardContent className="font-heading text-2xl text-foreground">
                  {overviewData.avgTurnaroundDays !== null
                    ? `${overviewData.avgTurnaroundDays.toFixed(1)} ${t("days")}`
                    : t("notAvailable")}
                </CardContent>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground">{t("totalRevenueHelp")}</p>

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
                      {overviewData.revenueByService.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">
                            {t("emptyState")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        overviewData.revenueByService.map((row) => (
                          <TableRow key={row.serviceType}>
                            <TableCell>
                              {row.serviceType === "unassigned" ? row.serviceType : tService(row.serviceType)}
                            </TableCell>
                            <TableCell>{formatMoney(row.revenue)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <SeasonalityChart data={overviewData.seasonality} />
            </div>
          </TabsContent>
        )}

        {visibility.full && billing && (
          <TabsContent value="billing" className="flex flex-col gap-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalInvoiced")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-2xl text-foreground">{formatMoney(billing.totalInvoiced)}</p>
                  <p className="text-xs text-muted-foreground">{t("totalInvoicedHelp")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("paidInvoiceAmount")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-2xl text-foreground">{formatMoney(billing.paidInvoiceAmount)}</p>
                  <p className="text-xs text-muted-foreground">{t("paidInvoiceAmountHelp")}</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t("invoicesByStatus")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("columnStatus")}</TableHead>
                      <TableHead>{t("columnCount")}</TableHead>
                      <TableHead>{t("columnTotal")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billing.byStatus.map((row) => (
                      <TableRow key={row.status}>
                        <TableCell>{t(`invoiceStatus.${row.status}`)}</TableCell>
                        <TableCell>{row.count}</TableCell>
                        <TableCell>{formatMoney(row.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {visibility.full && recordedPayments && (
          <TabsContent value="payments" className="flex flex-col gap-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("recordedPayments")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-2xl text-foreground">{formatMoney(recordedPayments.recordedTotal)}</p>
                  <p className="text-xs text-muted-foreground">{t("recordedPaymentsHelp")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("paymentCount")}</CardTitle>
                </CardHeader>
                <CardContent className="font-heading text-2xl text-foreground">{recordedPayments.paymentCount}</CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="pt-6">
                {recordedPayments.payments.length === 0 ? (
                  <p className="text-center text-muted-foreground">{t("emptyState")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("columnClient")}</TableHead>
                        <TableHead>{t("columnInvoice")}</TableHead>
                        <TableHead>{t("columnAmount")}</TableHead>
                        <TableHead>{t("columnPaymentDate")}</TableHead>
                        <TableHead>{t("columnMethod")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recordedPayments.payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.clientName}</TableCell>
                          <TableCell>INV-{String(p.invoiceSeq).padStart(5, "0")}</TableCell>
                          <TableCell>{formatMoney(p.amountPaid)}</TableCell>
                          <TableCell>{p.paymentDate ? formatDate(p.paymentDate) : "—"}</TableCell>
                          <TableCell>{p.paymentMethod ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {visibility.full && outstanding && (
          <TabsContent value="outstanding" className="flex flex-col gap-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("outstandingTotal")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-2xl text-foreground">{formatMoney(outstanding.outstandingTotal)}</p>
                  <p className="text-xs text-muted-foreground">{t("outstandingTotalHelp")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("outstandingCount")}</CardTitle>
                </CardHeader>
                <CardContent className="font-heading text-2xl text-foreground">{outstanding.outstandingCount}</CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t("aging")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("agingCurrent")}</p>
                    <p className="font-heading text-lg text-foreground">{formatMoney(outstanding.agingBuckets.current)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("aging1to30")}</p>
                    <p className="font-heading text-lg text-foreground">{formatMoney(outstanding.agingBuckets.d1_30)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("aging31to60")}</p>
                    <p className="font-heading text-lg text-foreground">{formatMoney(outstanding.agingBuckets.d31_60)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("aging61to90")}</p>
                    <p className="font-heading text-lg text-foreground">{formatMoney(outstanding.agingBuckets.d61_90)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("aging90plus")}</p>
                    <p className="font-heading text-lg text-foreground">{formatMoney(outstanding.agingBuckets.d90_plus)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("agingNoDueDate")}</p>
                    <p className="font-heading text-lg text-foreground">{formatMoney(outstanding.agingBuckets.noDueDate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                {outstanding.invoices.length === 0 ? (
                  <p className="text-center text-muted-foreground">{t("emptyState")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("columnClient")}</TableHead>
                        <TableHead>{t("columnInvoice")}</TableHead>
                        <TableHead>{t("columnDueDate")}</TableHead>
                        <TableHead>{t("columnInvoiceTotal")}</TableHead>
                        <TableHead>{t("columnRecordedPayments")}</TableHead>
                        <TableHead>{t("columnBalance")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outstanding.invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>{inv.clientName}</TableCell>
                          <TableCell>INV-{String(inv.invoiceSeq).padStart(5, "0")}</TableCell>
                          <TableCell>{inv.dueDate ? formatDate(inv.dueDate) : "—"}</TableCell>
                          <TableCell>{formatMoney(inv.total)}</TableCell>
                          <TableCell>{formatMoney(inv.recordedPayments)}</TableCell>
                          <TableCell>{formatMoney(inv.balanceDue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {visibility.referral && referralPerformance && (
          <TabsContent value="referrals" className="flex flex-col gap-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalReferrals")}</CardTitle>
                </CardHeader>
                <CardContent className="font-heading text-2xl text-foreground">{referralPerformance.totalReferrals}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("qualifiedReferrals")}</CardTitle>
                </CardHeader>
                <CardContent className="font-heading text-2xl text-foreground">{referralPerformance.qualified}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("convertedReferrals")}</CardTitle>
                </CardHeader>
                <CardContent className="font-heading text-2xl text-foreground">{referralPerformance.converted}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("openReferrals")}</CardTitle>
                </CardHeader>
                <CardContent className="font-heading text-2xl text-foreground">{referralPerformance.open}</CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t("referralsBySource")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t("sourceAlliance")}</p>
                  <p className="font-heading text-lg text-foreground">{referralPerformance.bySource.alliance}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("sourceExistingClient")}</p>
                  <p className="font-heading text-lg text-foreground">{referralPerformance.bySource.existingClient}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("sourceOther")}</p>
                  <p className="font-heading text-lg text-foreground">{referralPerformance.bySource.other}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("referralsByAlliance")}</CardTitle>
              </CardHeader>
              <CardContent>
                {referralPerformance.byAlliance.length === 0 ? (
                  <p className="text-center text-muted-foreground">{t("emptyState")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("columnAlliance")}</TableHead>
                        <TableHead>{t("columnReferrals")}</TableHead>
                        <TableHead>{t("columnConverted")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referralPerformance.byAlliance.map((row) => (
                        <TableRow key={row.allianceId}>
                          <TableCell>{row.allianceName}</TableCell>
                          <TableCell>{row.total}</TableCell>
                          <TableCell>{row.converted}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {visibility.referral && referralCompensation && (
          <TabsContent value="compensation" className="flex flex-col gap-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("compEarned")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-2xl text-foreground">{formatMoney(referralCompensation.earnedTotal)}</p>
                  <p className="text-xs text-muted-foreground">{t("compEarnedHelp")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("compApprovedPayable")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-2xl text-foreground">{formatMoney(referralCompensation.approvedTotal)}</p>
                  <p className="text-xs text-muted-foreground">{t("compApprovedPayableHelp")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("compPaid")}</CardTitle>
                </CardHeader>
                <CardContent className="font-heading text-2xl text-foreground">{formatMoney(referralCompensation.paidTotal)}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("compOutstanding")}</CardTitle>
                </CardHeader>
                <CardContent className="font-heading text-2xl text-foreground">{formatMoney(referralCompensation.outstandingTotal)}</CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="pt-6">
                {referralCompensation.rows.length === 0 ? (
                  <p className="text-center text-muted-foreground">{t("emptyState")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("columnReferral")}</TableHead>
                        <TableHead>{t("columnAlliance")}</TableHead>
                        <TableHead>{t("columnStatus")}</TableHead>
                        <TableHead>{t("columnApproved")}</TableHead>
                        <TableHead>{t("columnPaidSoFar")}</TableHead>
                        <TableHead>{t("columnOutstanding")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referralCompensation.rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>REF-{String(row.referralSeq).padStart(5, "0")}</TableCell>
                          <TableCell>{row.allianceName ?? "—"}</TableCell>
                          <TableCell>{tCompStatus(row.status)}</TableCell>
                          <TableCell>{row.approvedAmount !== null ? formatMoney(row.approvedAmount) : "—"}</TableCell>
                          <TableCell>{formatMoney(row.paidSoFar)}</TableCell>
                          <TableCell>{row.outstanding !== null ? formatMoney(row.outstanding) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {visibility.b2b && b2bPerformance && (
          <TabsContent value="b2b" className="flex flex-col gap-4 pt-4">
            <Card>
              <CardContent className="pt-6">
                {b2bPerformance.length === 0 ? (
                  <p className="text-center text-muted-foreground">{t("emptyState")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("columnAlliance")}</TableHead>
                        <TableHead>{t("columnStatus")}</TableHead>
                        <TableHead>{t("columnReferrals")}</TableHead>
                        <TableHead>{t("columnConverted")}</TableHead>
                        <TableHead>{t("columnAttributedBusiness")}</TableHead>
                        <TableHead>{t("compEarned")}</TableHead>
                        <TableHead>{t("compApprovedPayable")}</TableHead>
                        <TableHead>{t("compPaid")}</TableHead>
                        <TableHead>{t("columnMembership")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {b2bPerformance.map((row) => (
                        <TableRow key={row.allianceId}>
                          <TableCell>{row.allianceName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{tAllianceStatus(row.allianceStatus)}</Badge>
                          </TableCell>
                          <TableCell>{row.referralCount}</TableCell>
                          <TableCell>{row.convertedCount}</TableCell>
                          <TableCell>{formatMoney(row.attributedInvoiceTotal)}</TableCell>
                          <TableCell>{formatMoney(row.compensationEarned)}</TableCell>
                          <TableCell>{formatMoney(row.compensationApproved)}</TableCell>
                          <TableCell>{formatMoney(row.compensationPaid)}</TableCell>
                          <TableCell>
                            {row.membershipStatus ? (
                              <Badge variant="outline">{tMembershipStatus(row.membershipStatus)}</Badge>
                            ) : (
                              t("noMembership")
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">{t("attributionHelp")}</p>
          </TabsContent>
        )}

        {visibility.b2b && membershipFinancials && (
          <TabsContent value="membership" className="flex flex-col gap-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("contractedFeeTotal")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-2xl text-foreground">{formatMoney(membershipFinancials.contractedFeeTotal)}</p>
                  <p className="text-xs text-muted-foreground">{t("contractedFeeTotalHelp")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("membershipInvoiced")}</CardTitle>
                </CardHeader>
                <CardContent className="font-heading text-2xl text-foreground">{formatMoney(membershipFinancials.invoicedTotal)}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("membershipPaid")}</CardTitle>
                </CardHeader>
                <CardContent className="font-heading text-2xl text-foreground">{formatMoney(membershipFinancials.paidTotal)}</CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t("membershipsByFeeType")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {(Object.keys(membershipFinancials.feeTypeCounts) as Array<keyof typeof membershipFinancials.feeTypeCounts>).map((key) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground">{tFeeType(key)}</p>
                    <p className="font-heading text-lg text-foreground">{membershipFinancials.feeTypeCounts[key]}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                {membershipFinancials.memberships.length === 0 ? (
                  <p className="text-center text-muted-foreground">{t("emptyState")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("columnAlliance")}</TableHead>
                        <TableHead>{t("columnPlan")}</TableHead>
                        <TableHead>{t("columnFeeType")}</TableHead>
                        <TableHead>{t("columnAgreedFee")}</TableHead>
                        <TableHead>{t("columnLinkedInvoice")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {membershipFinancials.memberships.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>{m.allianceName}</TableCell>
                          <TableCell>{m.planNameSnapshot}</TableCell>
                          <TableCell>{tFeeType(m.feeType)}</TableCell>
                          <TableCell>{m.feeType === "standard" || m.feeType === "custom" ? formatMoney(m.priceSnapshot) : "—"}</TableCell>
                          <TableCell>
                            {m.linkedInvoiceStatus ? t(`invoiceStatus.${m.linkedInvoiceStatus}`) : t("noInvoiceLinked")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">{t("membershipFeeHelp")}</p>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

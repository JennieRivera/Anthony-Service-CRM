// Financial & Reporting Relationships — internal operational reporting
// layer. Every function here reads existing tables only (no schema
// change); see the phase report for why the existing referrals.allianceId/
// referrals.caseId/invoices.caseId/alliance_memberships.invoiceId
// relationships are sufficient for defensible attribution without adding
// new FKs.
//
// Core discipline enforced throughout this file (do not weaken without
// re-reading the phase brief):
// - BILLED (invoices.total) is never treated as COLLECTED. "Paid Invoice
//   Amount" (invoices.status = 'paid') and "Recorded Payments" (the
//   payments table) are reported separately because, in this codebase,
//   they are NOT kept in sync with each other (markInvoicePaidAction
//   never writes a payments row; createPaymentAction never touches
//   invoices.status) — see the phase report section F.
// - Membership priceSnapshot is an AGREED fee, never reported as
//   collected revenue on its own. Only a linked invoice's own
//   status/payments gives collection evidence.
// - Referral Compensation Approved/Paid/Outstanding is derived by
//   summing non-reversed referral_compensation_payments against
//   approvedAmount, exactly mirroring recomputePaidStatus() in
//   referralCompensations.ts, so this report can never disagree with the
//   compensation workflow's own state machine.
// - B2B Alliance revenue attribution only sums invoices whose caseId
//   matches a case linked to a referral that itself carries that
//   alliance's allianceId — never a lifetime/blanket attribution of a
//   referred client's later unrelated invoices.
// - alliance_network_relationships (B2B provenance) is never queried
//   here at all — it has no financial meaning in this phase.

import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  invoices,
  payments,
  clients,
  referrals,
  referralCompensations,
  referralCompensationPayments,
  strategicAlliances,
  allianceMemberships,
} from "@/lib/db/schema";

export type DateRange = { from: Date; to: Date };

function inRange(d: Date | null, range: DateRange) {
  if (!d) return false;
  return d >= range.from && d <= range.to;
}

// ---------------------------------------------------------------------
// Revenue / Billing — invoice-status based. "Total Invoiced" and "Paid
// Invoice Amount" are both derived purely from invoices; neither implies
// a payments-table record exists.
// ---------------------------------------------------------------------
export async function getRevenueBillingReport(range: DateRange) {
  const db = getDb();
  const allInvoices = await db
    .select({
      id: invoices.id,
      invoiceSeq: invoices.invoiceSeq,
      status: invoices.status,
      issueDate: invoices.issueDate,
      total: invoices.total,
      clientName: clients.fullName,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id));

  const inRangeInvoices = allInvoices.filter((inv) =>
    inRange(new Date(inv.issueDate), range),
  );

  const totalInvoiced = inRangeInvoices.reduce(
    (sum, inv) => sum + Number(inv.total),
    0,
  );
  const paidInvoices = inRangeInvoices.filter((inv) => inv.status === "paid");
  const paidInvoiceAmount = paidInvoices.reduce(
    (sum, inv) => sum + Number(inv.total),
    0,
  );
  const byStatus = (["unpaid", "paid", "overdue", "cancelled"] as const).map(
    (status) => {
      const rows = inRangeInvoices.filter((inv) => inv.status === status);
      return {
        status,
        count: rows.length,
        total: rows.reduce((sum, inv) => sum + Number(inv.total), 0),
      };
    },
  );

  return {
    totalInvoiced,
    totalInvoiceCount: inRangeInvoices.length,
    paidInvoiceAmount,
    paidInvoiceCount: paidInvoices.length,
    byStatus,
    invoices: inRangeInvoices
      .map((inv) => ({ ...inv, total: Number(inv.total) }))
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate)),
  };
}

// ---------------------------------------------------------------------
// Recorded Payments — the payments table only. Never includes
// referral_compensation_payments (outgoing compensation, kept separate
// per phase brief section 7).
// ---------------------------------------------------------------------
export async function getRecordedPaymentsReport(range: DateRange) {
  const db = getDb();
  const rows = await db
    .select({
      id: payments.id,
      amountPaid: payments.amountPaid,
      status: payments.status,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      refundStatus: payments.refundStatus,
      invoiceId: invoices.id,
      invoiceSeq: invoices.invoiceSeq,
      clientName: clients.fullName,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .innerJoin(clients, eq(invoices.clientId, clients.id));

  const inRangeRows = rows.filter((p) =>
    p.paymentDate ? inRange(new Date(p.paymentDate), range) : false,
  );

  const recordedTotal = inRangeRows.reduce(
    (sum, p) => sum + Number(p.amountPaid),
    0,
  );

  return {
    recordedTotal,
    paymentCount: inRangeRows.length,
    payments: inRangeRows
      .map((p) => ({ ...p, amountPaid: Number(p.amountPaid) }))
      .sort((a, b) => (b.paymentDate ?? "").localeCompare(a.paymentDate ?? "")),
  };
}

// ---------------------------------------------------------------------
// Shared balance-due logic — used by BOTH the Outstanding Invoices report
// and the Dashboard's "Outstanding" KPI, so the two can never disagree.
//
// Why this sums payments.amountPaid rather than trusting payments.balanceDue:
// createPaymentAction computes each row's balanceDue as
// `invoiceTotal - THIS row's own amountPaid` only — it never looks at any
// other payment row for the same invoice (confirmed by reading
// src/app/[locale]/(app)/payments/actions.ts). payments.invoiceId has no
// unique constraint and the "New Payment" invoice picker
// (listInvoicesForSelect) does not exclude invoices that already have a
// payment, so a single invoice can genuinely accumulate multiple payment
// rows. balanceDue on any one of those rows is therefore NOT a reliable
// cumulative remaining balance — summing every row's own amountPaid and
// subtracting once from the invoice's own total is the only calculation
// here that can't double-count or silently drop a transaction.
//
// Deliberately NOT netted here: payments.refundStatus. No existing code
// path anywhere in this app subtracts a refund from any payment total
// (the Recorded Payments report sums raw amountPaid the same way), and
// there is no "reversed" flag on `payments` the way there is on
// referral_compensation_payments — inventing refund-netting logic now
// would be new accounting behavior the brief's "no scope creep" section
// explicitly rules out. Documented as a known limitation in the phase
// report, not silently assumed away.
export async function getRecordedPaymentsByInvoice(): Promise<Map<string, number>> {
  const db = getDb();
  const rows = await db.select({ invoiceId: payments.invoiceId, amountPaid: payments.amountPaid }).from(payments);
  const byInvoice = new Map<string, number>();
  for (const p of rows) {
    byInvoice.set(p.invoiceId, (byInvoice.get(p.invoiceId) ?? 0) + Number(p.amountPaid));
  }
  return byInvoice;
}

// Invoice face value minus every recorded payment against it, floored at
// zero so a report can never show a negative "still owed" figure even if
// recorded payments happen to exceed the invoice total.
export function computeBalanceDue(invoiceTotal: number, recordedPayments: number) {
  return Math.max(invoiceTotal - recordedPayments, 0);
}

// ---------------------------------------------------------------------
// Outstanding Invoices — unpaid/overdue status only (an invoice marked
// Paid or Cancelled never appears here, regardless of payment evidence —
// section 6 of the phase brief). Balance Due is invoice total minus every
// recorded payment against that invoice (see computeBalanceDue above),
// never the raw invoice total. An invoice whose recorded payments already
// cover its total (balance = $0) is excluded from the list/total/count —
// its status being stuck at unpaid/overdue is a data-hygiene gap, not an
// amount still owed, and showing it as "outstanding" would misstate what
// the CRM has evidence of. Aging buckets use the SAME Balance Due, and
// each invoice is placed in exactly one bucket by its own due date —
// payment rows are never allocated into buckets independently.
// ---------------------------------------------------------------------
export async function getOutstandingInvoicesReport() {
  const db = getDb();
  const [rows, recordedByInvoice] = await Promise.all([
    db
      .select({
        id: invoices.id,
        invoiceSeq: invoices.invoiceSeq,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        total: invoices.total,
        clientName: clients.fullName,
        clientId: clients.id,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(ne(invoices.status, "paid"), ne(invoices.status, "cancelled"))),
    getRecordedPaymentsByInvoice(),
  ]);

  const now = new Date();
  const agingBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, noDueDate: 0 };
  const outstanding = rows
    .map((inv) => {
      const total = Number(inv.total);
      const recordedPayments = recordedByInvoice.get(inv.id) ?? 0;
      const balanceDue = computeBalanceDue(total, recordedPayments);
      let daysPastDue: number | null = null;
      if (inv.dueDate) {
        daysPastDue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000);
      }
      return { ...inv, total, recordedPayments, balanceDue, daysPastDue };
    })
    // An invoice whose recorded payments already cover its total has a $0
    // balance due — it contributes nothing to "still owed" reporting even
    // though its status field was never updated to Paid.
    .filter((inv) => inv.balanceDue > 0);

  for (const inv of outstanding) {
    if (inv.daysPastDue === null) {
      agingBuckets.noDueDate += inv.balanceDue;
    } else if (inv.daysPastDue <= 0) {
      agingBuckets.current += inv.balanceDue;
    } else if (inv.daysPastDue <= 30) {
      agingBuckets.d1_30 += inv.balanceDue;
    } else if (inv.daysPastDue <= 60) {
      agingBuckets.d31_60 += inv.balanceDue;
    } else if (inv.daysPastDue <= 90) {
      agingBuckets.d61_90 += inv.balanceDue;
    } else {
      agingBuckets.d90_plus += inv.balanceDue;
    }
  }

  return {
    outstandingTotal: outstanding.reduce((sum, inv) => sum + inv.balanceDue, 0),
    outstandingCount: outstanding.length,
    agingBuckets,
    invoices: outstanding.sort((a, b) => (b.daysPastDue ?? -9999) - (a.daysPastDue ?? -9999)),
  };
}

// ---------------------------------------------------------------------
// Referral Performance — counts only, from the real status/pipeline
// enums that exist. "Converted" = status 'closed_won' (the only status
// that means a referral actually turned into business); nothing else is
// invented.
// ---------------------------------------------------------------------
export async function getReferralPerformanceReport(range: DateRange) {
  const db = getDb();
  const rows = await db
    .select({
      id: referrals.id,
      referralSeq: referrals.referralSeq,
      referralDate: referrals.referralDate,
      category: referrals.category,
      status: referrals.status,
      pipelineStatus: referrals.pipelineStatus,
      allianceId: referrals.allianceId,
      referrerClientId: referrals.referrerClientId,
      allianceName: strategicAlliances.organizationName,
    })
    .from(referrals)
    .leftJoin(strategicAlliances, eq(referrals.allianceId, strategicAlliances.id));

  const inRangeRows = rows.filter((r) => inRange(new Date(r.referralDate), range));

  const bySource = {
    alliance: inRangeRows.filter((r) => r.allianceId).length,
    existingClient: inRangeRows.filter((r) => !r.allianceId && r.referrerClientId).length,
    other: inRangeRows.filter((r) => !r.allianceId && !r.referrerClientId).length,
  };

  const byAllianceMap = new Map<string, { allianceName: string; total: number; converted: number }>();
  for (const r of inRangeRows) {
    if (!r.allianceId || !r.allianceName) continue;
    const entry = byAllianceMap.get(r.allianceId) ?? { allianceName: r.allianceName, total: 0, converted: 0 };
    entry.total += 1;
    if (r.status === "closed_won") entry.converted += 1;
    byAllianceMap.set(r.allianceId, entry);
  }

  return {
    totalReferrals: inRangeRows.length,
    qualified: inRangeRows.filter((r) => r.pipelineStatus === "qualified" || r.status === "closed_won").length,
    converted: inRangeRows.filter((r) => r.status === "closed_won").length,
    lost: inRangeRows.filter((r) => r.status === "closed_lost").length,
    open: inRangeRows.filter((r) => r.status === "submitted" || r.status === "in_progress").length,
    bySource,
    byAlliance: Array.from(byAllianceMap.entries()).map(([allianceId, v]) => ({ allianceId, ...v })),
  };
}

// ---------------------------------------------------------------------
// Referral Compensation — Not Earned / Earned / Approved / Paid /
// Outstanding, computed the same way recomputePaidStatus() in
// referralCompensations.ts does (non-reversed payments summed against
// approvedAmount), so this report can never show a number that
// disagrees with the live compensation workflow.
// ---------------------------------------------------------------------
export async function getReferralCompensationReport(range: DateRange) {
  const db = getDb();
  const compRows = await db
    .select({
      id: referralCompensations.id,
      referralId: referralCompensations.referralId,
      status: referralCompensations.status,
      eligibleBaseAmount: referralCompensations.eligibleBaseAmount,
      approvedAmount: referralCompensations.approvedAmount,
      earnedAt: referralCompensations.earnedAt,
      approvedAt: referralCompensations.approvedAt,
      referralSeq: referrals.referralSeq,
      allianceId: referrals.allianceId,
      allianceName: strategicAlliances.organizationName,
    })
    .from(referralCompensations)
    .innerJoin(referrals, eq(referralCompensations.referralId, referrals.id))
    .leftJoin(strategicAlliances, eq(referrals.allianceId, strategicAlliances.id));

  const paymentRows = await db
    .select({
      referralCompensationId: referralCompensationPayments.referralCompensationId,
      amountPaid: referralCompensationPayments.amountPaid,
      reversed: referralCompensationPayments.reversed,
      paymentDate: referralCompensationPayments.paymentDate,
    })
    .from(referralCompensationPayments);

  const paidByCompId = new Map<string, number>();
  for (const p of paymentRows) {
    if (p.reversed) continue;
    if (!inRange(new Date(p.paymentDate), range)) continue;
    paidByCompId.set(
      p.referralCompensationId,
      (paidByCompId.get(p.referralCompensationId) ?? 0) + Number(p.amountPaid),
    );
  }
  // All-time paid (not range-limited) is needed to compute outstanding
  // correctly — a payment made before this range still reduces what's
  // currently payable.
  const allTimePaidByCompId = new Map<string, number>();
  for (const p of paymentRows) {
    if (p.reversed) continue;
    allTimePaidByCompId.set(
      p.referralCompensationId,
      (allTimePaidByCompId.get(p.referralCompensationId) ?? 0) + Number(p.amountPaid),
    );
  }

  const notEarned = compRows.filter((c) => c.status === "not_earned");
  const earned = compRows.filter((c) => c.status === "earned");
  const approvedOrPaid = compRows.filter((c) => c.status === "approved" || c.status === "paid");

  const earnedTotal = earned.reduce((sum, c) => sum + Number(c.eligibleBaseAmount ?? 0), 0);
  const approvedTotal = approvedOrPaid.reduce((sum, c) => sum + Number(c.approvedAmount ?? 0), 0);
  const paidTotal = compRows.reduce((sum, c) => sum + (paidByCompId.get(c.id) ?? 0), 0);
  const outstandingTotal = approvedOrPaid.reduce((sum, c) => {
    const approved = Number(c.approvedAmount ?? 0);
    const paid = allTimePaidByCompId.get(c.id) ?? 0;
    return sum + Math.max(approved - paid, 0);
  }, 0);

  return {
    notEarnedCount: notEarned.length,
    earnedCount: earned.length,
    earnedTotal,
    approvedCount: approvedOrPaid.length,
    approvedTotal,
    paidTotal,
    outstandingTotal,
    rows: compRows.map((c) => ({
      ...c,
      eligibleBaseAmount: c.eligibleBaseAmount ? Number(c.eligibleBaseAmount) : null,
      approvedAmount: c.approvedAmount ? Number(c.approvedAmount) : null,
      paidSoFar: allTimePaidByCompId.get(c.id) ?? 0,
      outstanding:
        c.status === "approved" || c.status === "paid"
          ? Math.max(Number(c.approvedAmount ?? 0) - (allTimePaidByCompId.get(c.id) ?? 0), 0)
          : null,
    })),
  };
}

// ---------------------------------------------------------------------
// Membership Financials — distinguishes contracted fee (priceSnapshot)
// from invoiced from paid. A complimentary/waived/sponsored membership
// never contributes to any dollar total (Scenario F).
// ---------------------------------------------------------------------
export async function getMembershipFinancialReport() {
  const db = getDb();
  const rows = await db
    .select({
      id: allianceMemberships.id,
      allianceId: allianceMemberships.allianceId,
      allianceName: strategicAlliances.organizationName,
      planNameSnapshot: allianceMemberships.planNameSnapshot,
      status: allianceMemberships.status,
      feeType: allianceMemberships.feeType,
      priceSnapshot: allianceMemberships.priceSnapshot,
      renewalDate: allianceMemberships.renewalDate,
      invoiceId: allianceMemberships.invoiceId,
    })
    .from(allianceMemberships)
    .innerJoin(strategicAlliances, eq(allianceMemberships.allianceId, strategicAlliances.id))
    .where(ne(allianceMemberships.status, "cancelled"));

  const invoiceIds = new Set(rows.map((r) => r.invoiceId).filter((id): id is string => id != null));
  // Membership counts are small in this CRM — a single unfiltered fetch
  // plus an in-memory filter is simpler and fast enough than building a
  // dynamic IN(...) clause here.
  const invoiceById = new Map<string, { id: string; status: string; total: string }>();
  if (invoiceIds.size > 0) {
    const allInvoicesForLookup = await db
      .select({ id: invoices.id, status: invoices.status, total: invoices.total })
      .from(invoices);
    for (const inv of allInvoicesForLookup) {
      if (invoiceIds.has(inv.id)) invoiceById.set(inv.id, inv);
    }
  }

  const feeTypeCounts = { standard: 0, complimentary: 0, waived: 0, sponsored: 0, custom: 0 };
  let contractedFeeTotal = 0; // standard/custom only — never complimentary/waived/sponsored
  let invoicedTotal = 0;
  let paidTotal = 0;

  const detailed = rows.map((m) => {
    feeTypeCounts[m.feeType] += 1;
    const isRevenueBearing = m.feeType === "standard" || m.feeType === "custom";
    const price = m.priceSnapshot ? Number(m.priceSnapshot) : 0;
    if (isRevenueBearing) contractedFeeTotal += price;

    const linkedInvoice = m.invoiceId ? invoiceById.get(m.invoiceId) : null;
    if (isRevenueBearing && linkedInvoice) {
      invoicedTotal += Number(linkedInvoice.total);
      if (linkedInvoice.status === "paid") paidTotal += Number(linkedInvoice.total);
    }

    return {
      ...m,
      priceSnapshot: price,
      linkedInvoiceStatus: linkedInvoice?.status ?? null,
      linkedInvoiceTotal: linkedInvoice ? Number(linkedInvoice.total) : null,
    };
  });

  return {
    activeCount: rows.filter((r) => r.status === "active").length,
    feeTypeCounts,
    contractedFeeTotal,
    invoicedTotal,
    paidTotal,
    memberships: detailed,
  };
}

// ---------------------------------------------------------------------
// B2B Alliance Performance — per-alliance rollup. Attributed invoice
// total is computed strictly via Referral -> Case -> Invoice; a referral
// with no caseId, or whose case has no invoice, contributes $0
// attribution (never guessed).
// ---------------------------------------------------------------------
export async function getB2BAlliancePerformanceReport() {
  const db = getDb();
  const [allAlliances, allReferrals, allCompensations, allCompPayments, allMemberships, allInvoices] = await Promise.all([
    db.select().from(strategicAlliances),
    db.select().from(referrals),
    db.select().from(referralCompensations),
    db.select().from(referralCompensationPayments),
    db
      .select()
      .from(allianceMemberships)
      .where(ne(allianceMemberships.status, "cancelled")),
    db.select({ id: invoices.id, caseId: invoices.caseId, total: invoices.total, status: invoices.status }).from(invoices),
  ]);

  const compByReferralId = new Map(allCompensations.map((c) => [c.referralId, c]));
  const paidByCompId = new Map<string, number>();
  for (const p of allCompPayments) {
    if (p.reversed) continue;
    paidByCompId.set(
      p.referralCompensationId,
      (paidByCompId.get(p.referralCompensationId) ?? 0) + Number(p.amountPaid),
    );
  }
  const invoicesByCaseId = new Map<string, typeof allInvoices>();
  for (const inv of allInvoices) {
    if (!inv.caseId) continue;
    const list = invoicesByCaseId.get(inv.caseId) ?? [];
    list.push(inv);
    invoicesByCaseId.set(inv.caseId, list);
  }

  return allAlliances.map((alliance) => {
    const allianceReferrals = allReferrals.filter((r) => r.allianceId === alliance.id);
    const converted = allianceReferrals.filter((r) => r.status === "closed_won");

    let attributedInvoiceTotal = 0;
    const attributedInvoiceIds = new Set<string>();
    for (const r of allianceReferrals) {
      if (!r.caseId) continue;
      const caseInvoices = invoicesByCaseId.get(r.caseId) ?? [];
      for (const inv of caseInvoices) {
        if (attributedInvoiceIds.has(inv.id)) continue;
        if (inv.status === "cancelled") continue;
        attributedInvoiceIds.add(inv.id);
        attributedInvoiceTotal += Number(inv.total);
      }
    }

    let compEarned = 0;
    let compApproved = 0;
    let compPaid = 0;
    for (const r of allianceReferrals) {
      const comp = compByReferralId.get(r.id);
      if (!comp) continue;
      if (comp.status === "earned") compEarned += Number(comp.eligibleBaseAmount ?? 0);
      if (comp.status === "approved" || comp.status === "paid") {
        compApproved += Number(comp.approvedAmount ?? 0);
      }
      compPaid += paidByCompId.get(comp.id) ?? 0;
    }

    const membership = allMemberships.find((m) => m.allianceId === alliance.id) ?? null;

    return {
      allianceId: alliance.id,
      allianceName: alliance.organizationName,
      allianceStatus: alliance.status,
      referralCount: allianceReferrals.length,
      convertedCount: converted.length,
      attributedInvoiceTotal,
      attributedInvoiceCount: attributedInvoiceIds.size,
      compensationEarned: compEarned,
      compensationApproved: compApproved,
      compensationPaid: compPaid,
      membershipStatus: membership?.status ?? null,
      membershipFeeType: membership?.feeType ?? null,
    };
  });
}

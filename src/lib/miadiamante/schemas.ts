// MIADIAMANTE AI Foundation — Phase 2A. Server-side input validation for
// every capability that takes an input. Master prompt section 9: "This
// phase is NOT 'give the model any record ID and fetch whatever it
// wants.' Use typed, controlled inputs... Validate all inputs
// server-side." zod is already this codebase's established validation
// library (every *Form.tsx uses zodResolver) — reused here, not a new
// dependency.
//
// Every schema below is deliberately narrow: no free-text search input,
// no arbitrary filter object, no unbounded limit/range. Malformed,
// SQL-injection-shaped, or out-of-range input fails `.safeParse()` here,
// before any database call — see capabilityRunner.ts.

import { z } from "zod";

// invoice_summary.read — a single, validated invoice id. Rejects anything
// that isn't a well-formed UUID (so a SQL-injection-shaped or malformed
// string never reaches a query) without revealing whether a differently-
// shaped id would have existed.
export const invoiceSummaryInputSchema = z.object({
  invoiceId: z.string().uuid(),
});
export type InvoiceSummaryInput = z.infer<typeof invoiceSummaryInputSchema>;

// financial_report_summary.read — an optional, bounded date range.
// Section 29 ("Performance... constrained date windows") — capped at 2
// years so a caller can't request an unbounded/excessive range; section
// 26's "excessive date range" security test exercises this. Defaults to
// the same trailing-12-months window the real Reports page defaults to
// when omitted (see dto.ts).
const MAX_REPORT_RANGE_DAYS = 730;
export const financialReportSummaryInputSchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine(
    (v) => {
      if (!v.from || !v.to) return true;
      if (v.to < v.from) return false;
      const days = (v.to.getTime() - v.from.getTime()) / 86_400_000;
      return days <= MAX_REPORT_RANGE_DAYS;
    },
    { message: `Date range must be valid and no more than ${MAX_REPORT_RANGE_DAYS} days.` },
  );
export type FinancialReportSummaryInput = z.infer<typeof financialReportSummaryInputSchema>;

// task_list.read — a bounded limit only. The only existing, reused query
// function (listOpenTasks()) is hardcoded to status "open" (the real
// taskStatusEnum also has "done"/"dismissed", but no safe reusable query
// exists for those yet) — rather than write a parallel query to support a
// broader filter this phase didn't audit, the capability mirrors exactly
// what listOpenTasks() already does, honestly, not a guessed superset.
const MAX_TASK_LIMIT = 50;
export const taskListInputSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_TASK_LIMIT).optional().default(MAX_TASK_LIMIT),
});
export type TaskListInput = z.infer<typeof taskListInputSchema>;

// upcoming_appointments.read — a bounded limit only (no arbitrary date-
// range dump of the whole calendar — section 8: "Do not dump the entire
// calendar").
const MAX_APPOINTMENT_LIMIT = 20;
export const upcomingAppointmentsInputSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_APPOINTMENT_LIMIT).optional().default(5),
});
export type UpcomingAppointmentsInput = z.infer<typeof upcomingAppointmentsInputSchema>;

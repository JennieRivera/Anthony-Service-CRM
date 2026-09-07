import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/db/config";
import { insuranceComplianceDetails, cases, tasks } from "@/lib/db/schema";

// Insurance & Compliance follow-up (its own service, separate from the
// Documents-cabinet phases). Mirrors /api/cron/inactivity-check exactly: a
// daily sweep that creates a task once, deduped by checking for an
// existing open one first. "Expiring soon" is never stored — this reads
// expirationDate live against each case's own renewalReminderDays window,
// so it can't drift out of sync.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const db = getDb();

  const dueSoon = await db
    .select({
      caseId: insuranceComplianceDetails.caseId,
      clientId: cases.clientId,
      title: cases.title,
      subType: insuranceComplianceDetails.subType,
      provider: insuranceComplianceDetails.provider,
      expirationDate: insuranceComplianceDetails.expirationDate,
    })
    .from(insuranceComplianceDetails)
    .innerJoin(cases, eq(insuranceComplianceDetails.caseId, cases.id))
    .where(
      and(
        eq(insuranceComplianceDetails.status, "active"),
        sql`${insuranceComplianceDetails.expirationDate} IS NOT NULL`,
        sql`${insuranceComplianceDetails.expirationDate} <= (CURRENT_DATE + ${insuranceComplianceDetails.renewalReminderDays} * INTERVAL '1 day')`,
      ),
    );

  let created = 0;
  for (const item of dueSoon) {
    const [existing] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.caseId, item.caseId),
          eq(tasks.type, "renewal_reminder"),
          eq(tasks.status, "open"),
        ),
      )
      .limit(1);

    if (!existing) {
      await db.insert(tasks).values({
        clientId: item.clientId,
        caseId: item.caseId,
        type: "renewal_reminder",
        title: `Renewal due soon: ${item.provider ?? item.subType} — ${item.title}`,
        dueDate: item.expirationDate,
      });
      created += 1;
    }
  }

  return NextResponse.json({ checked: dueSoon.length, created });
}

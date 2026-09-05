import { NextRequest, NextResponse } from "next/server";
import { and, eq, lt, notInArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/db/config";
import { cases, tasks } from "@/lib/db/schema";

// Phase 2, Session 7 — scheduled inactivity sweep (see vercel.json `crons`).
// No period was specified in PHASE2-PLAN.md, so 14 days is a sensible default
// for a client-services CRM; adjust here if the business wants it tighter/looser.
const INACTIVITY_THRESHOLD_DAYS = 14;

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
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - INACTIVITY_THRESHOLD_DAYS);

  const staleCases = await db
    .select({ id: cases.id, clientId: cases.clientId, title: cases.title })
    .from(cases)
    .where(
      and(
        notInArray(cases.status, ["completed", "cancelled"]),
        lt(cases.updatedAt, threshold),
      ),
    );

  let created = 0;
  for (const c of staleCases) {
    const [existing] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.caseId, c.id),
          eq(tasks.type, "inactivity_alert"),
          eq(tasks.status, "open"),
        ),
      )
      .limit(1);

    if (!existing) {
      await db.insert(tasks).values({
        clientId: c.clientId,
        caseId: c.id,
        type: "inactivity_alert",
        title: `Inactivity alert: ${c.title}`,
      });
      created += 1;
    }
  }

  return NextResponse.json({
    checked: staleCases.length,
    created,
    thresholdDays: INACTIVITY_THRESHOLD_DAYS,
  });
}

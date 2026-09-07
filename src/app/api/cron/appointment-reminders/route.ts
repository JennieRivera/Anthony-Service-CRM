import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, lte, notInArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/db/config";
import { appointments, tasks } from "@/lib/db/schema";

// Calendar enhancement, Session 5 (section 8) — "24h antes -> preparar
// recordatorio. 2h antes -> preparar segundo recordatorio." Mirrors
// /api/cron/renewal-check exactly: a periodic sweep that creates a task
// once per tier, deduped by checking for an existing open one first —
// never sends anything itself, same "prepare, don't auto-send" rule
// already applied to Communications/HighLevel/WhatsApp elsewhere in this
// CRM. Runs hourly (see vercel.json) so a 2-hour-out window isn't missed
// between checks; if the hosting plan only allows a daily cron, the 2h
// tier will effectively fire once appointments are already inside that
// window rather than exactly at the 2h mark.
const NOT_APPLICABLE_STATUSES = ["cancelled", "completed", "no_show", "rescheduled"] as const;

async function sweepTier(
  db: ReturnType<typeof getDb>,
  windowHours: number,
  tierLabel: string,
) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  const due = await db
    .select({
      id: appointments.id,
      clientId: appointments.clientId,
      caseId: appointments.caseId,
      title: appointments.title,
    })
    .from(appointments)
    .where(
      and(
        notInArray(appointments.status, [...NOT_APPLICABLE_STATUSES]),
        gt(appointments.startAt, now),
        lte(appointments.startAt, windowEnd),
      ),
    );

  let created = 0;
  for (const appt of due) {
    const title = `${tierLabel} reminder: ${appt.title}`;
    const [existing] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.appointmentId, appt.id),
          eq(tasks.type, "appointment_reminder"),
          eq(tasks.title, title),
        ),
      )
      .limit(1);

    if (!existing) {
      await db.insert(tasks).values({
        clientId: appt.clientId,
        caseId: appt.caseId,
        appointmentId: appt.id,
        type: "appointment_reminder",
        title,
      });
      created += 1;
    }
  }

  return { checked: due.length, created };
}

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
  const [tier24h, tier2h] = await Promise.all([
    sweepTier(db, 24, "24h"),
    sweepTier(db, 2, "2h"),
  ]);

  return NextResponse.json({ tier24h, tier2h });
}

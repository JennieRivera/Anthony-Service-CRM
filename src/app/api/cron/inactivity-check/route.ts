import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, lt, notInArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/db/config";
import { cases, tasks, clients, conversationMessages } from "@/lib/db/schema";

// Phase 2, Session 7 — scheduled inactivity sweep (see vercel.json `crons`).
// No period was specified in PHASE2-PLAN.md, so 14 days is a sensible default
// for a client-services CRM; adjust here if the business wants it tighter/looser.
const INACTIVITY_THRESHOLD_DAYS = 14;

// Phase 4, Session 6 — separate threshold for "no communication logged with
// this client in N days" (spec section 10). Kept as its own constant even
// though it starts equal to the case threshold, since the business may want
// to tune these independently later.
const COMMUNICATION_INACTIVITY_THRESHOLD_DAYS = 14;

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

  // Phase 4, Session 6 — a second, independent sweep: clients with at least
  // one active case but no logged communication in N days. Scoped to
  // clients with an active case (not every client ever created) so a
  // long-closed relationship doesn't generate a perpetual alert.
  const commThreshold = new Date();
  commThreshold.setDate(
    commThreshold.getDate() - COMMUNICATION_INACTIVITY_THRESHOLD_DAYS,
  );

  const activeClientIds = await db
    .selectDistinct({ clientId: cases.clientId })
    .from(cases)
    .where(notInArray(cases.status, ["completed", "cancelled"]));

  let communicationAlertsCreated = 0;
  for (const { clientId } of activeClientIds) {
    const [client] = await db
      .select({ id: clients.id, createdAt: clients.createdAt })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    if (!client) continue;

    const [lastMessage] = await db
      .select({ occurredAt: conversationMessages.occurredAt })
      .from(conversationMessages)
      .where(eq(conversationMessages.clientId, clientId))
      .orderBy(desc(conversationMessages.occurredAt))
      .limit(1);

    const lastContact = lastMessage?.occurredAt ?? client.createdAt;
    if (new Date(lastContact) >= commThreshold) continue;

    const [existingAlert] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.clientId, clientId),
          isNull(tasks.caseId),
          eq(tasks.type, "inactivity_alert"),
          eq(tasks.status, "open"),
        ),
      )
      .limit(1);

    if (!existingAlert) {
      await db.insert(tasks).values({
        clientId,
        caseId: null,
        type: "inactivity_alert",
        title: "No communication logged recently",
      });
      communicationAlertsCreated += 1;
    }
  }

  return NextResponse.json({
    checked: staleCases.length,
    created,
    communicationAlertsChecked: activeClientIds.length,
    communicationAlertsCreated,
    thresholdDays: INACTIVITY_THRESHOLD_DAYS,
    communicationThresholdDays: COMMUNICATION_INACTIVITY_THRESHOLD_DAYS,
  });
}

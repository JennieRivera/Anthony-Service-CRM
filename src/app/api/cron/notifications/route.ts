import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { dispatchDueNotices, queueDueReminders } from "@/lib/notifications/engine";
import { noticeDb, noticeDeps } from "@/lib/notifications/server";

// Automatic notices (Step 3B) — the scheduled run. Queues appointment
// reminders that are due, then sends everything whose time has come
// (SMS held overnight, retries of failed sends).
//
// Runs every 15 minutes (vercel.json; the project is on Vercel Pro).
// With "Precise reminders" on (the default) reminders go 24 h and 2 h
// before; turned off, one reminder the day before (from 9 AM Florida).
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const db = noticeDb();
  const deps = noticeDeps();
  const reminders = await queueDueReminders(db, deps);
  const sent = await dispatchDueNotices(db, deps);
  return NextResponse.json({ reminders, sent });
}

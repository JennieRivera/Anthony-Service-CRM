import { after } from "next/server";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/db/config";
import type { PortalDb } from "@/lib/portal/db";
import { realSenders } from "./providers";
import type { NoticeDeps } from "./engine";

// Next.js glue for automatic notices (Step 3B).

// Where links in notices point. APP_BASE_URL wins; otherwise the
// production domain Vercel reports; locally, localhost.
export function noticeBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL?.replace(/\/+$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function noticeDeps(): NoticeDeps {
  return { senders: realSenders, baseUrl: noticeBaseUrl(), ownerFallbackEmail: process.env.ADMIN_EMAIL ?? null };
}

export const noticeDb = () => getDb() as unknown as PortalDb;

// Runs a notice AFTER the response is sent, so staff never wait on email
// or SMS providers, and a provider problem can never break the action
// that triggered it (it's logged, the outbox keeps the failure).
export function sendNoticeAfter(label: string, work: (db: PortalDb, deps: NoticeDeps) => Promise<unknown>) {
  if (!isDatabaseConfigured()) return;
  after(async () => {
    try {
      await work(noticeDb(), noticeDeps());
    } catch (err) {
      console.error(`[notices] ${label} failed`, err);
    }
  });
}

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  facebookMessengerThreads,
  instagramDmThreads,
  websiteChatSessions,
  clients,
  cases,
} from "@/lib/db/schema";

export async function listFacebookThreads() {
  return getDb()
    .select({
      thread: facebookMessengerThreads,
      clientName: clients.fullName,
      caseTitle: cases.title,
    })
    .from(facebookMessengerThreads)
    .leftJoin(clients, eq(facebookMessengerThreads.clientId, clients.id))
    .leftJoin(cases, eq(facebookMessengerThreads.caseId, cases.id))
    .orderBy(desc(facebookMessengerThreads.createdAt));
}

export async function listInstagramThreads() {
  return getDb()
    .select({
      thread: instagramDmThreads,
      clientName: clients.fullName,
      caseTitle: cases.title,
    })
    .from(instagramDmThreads)
    .leftJoin(clients, eq(instagramDmThreads.clientId, clients.id))
    .leftJoin(cases, eq(instagramDmThreads.caseId, cases.id))
    .orderBy(desc(instagramDmThreads.createdAt));
}

export async function listWebsiteChatSessions() {
  return getDb()
    .select({
      session: websiteChatSessions,
      clientName: clients.fullName,
    })
    .from(websiteChatSessions)
    .leftJoin(clients, eq(websiteChatSessions.clientId, clients.id))
    .orderBy(desc(websiteChatSessions.createdAt));
}

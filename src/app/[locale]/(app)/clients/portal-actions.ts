"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { requireAuthenticatedUser } from "@/lib/permissions";
import {
  PortalAccessError,
  createPortalAccessLink,
  revokePortalAccess,
} from "@/lib/portal/access";
import type { PortalDb } from "@/lib/portal/db";
import { randomUUID } from "node:crypto";
import { isWithinSmsHours } from "@/lib/notifications/config";
import { availableChannelsForClient, getNotificationSettings, notifyClient } from "@/lib/notifications/engine";
import { noticeDeps } from "@/lib/notifications/server";

// Staff-side controls for a client's portal access (Step 2A). The raw link
// token is returned exactly once, to be copied and sent by WhatsApp; only
// its hash is stored.

const db = () => getDb() as unknown as PortalDb;

export async function createPortalLinkAction(
  clientId: string,
): Promise<{ ok: true; url: string; expiresAt: string } | { ok: false; error: "no_phone" | "not_found" }> {
  await requireAuthenticatedUser();
  const staffEmail = (await auth())?.user?.email ?? null;

  const [client] = await getDb()
    .select({ preferredLanguage: clients.preferredLanguage })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return { ok: false, error: "not_found" };

  let link;
  try {
    link = await createPortalAccessLink(db(), { clientId, createdByEmail: staffEmail });
  } catch (err) {
    if (err instanceof PortalAccessError) return { ok: false, error: "no_phone" };
    throw err;
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  // The token goes after "#": browsers never send it to the server, so it
  // never lands in access logs or in the Referer header.
  const url = `${proto}://${host}/${client.preferredLanguage}/portal/access#${link.token}`;

  await logAuditEvent({
    action: "portal.link_created",
    entityType: "client",
    entityId: clientId,
    summary: `Portal access link generated (expires ${link.expiresAt.toISOString()})`,
  });
  revalidatePath(`/clients/${clientId}`);
  return { ok: true, url, expiresAt: link.expiresAt.toISOString() };
}

export type SendPortalLinkResult =
  | { ok: true; channel: "sms" | "email"; testMode: boolean }
  | {
      ok: false;
      error: "not_found" | "no_phone" | "not_authorized" | "disabled" | "outside_sms_hours" | "send_failed" | "test_contact_missing";
    };

// Step 3B: generates a NEW personal link and sends it straight to the
// client by SMS or email — only through a channel the client authorized.
// The token is never stored (the outbox/Communications copy says "[link]").
export async function sendPortalLinkAction(clientId: string, channel: "sms" | "email"): Promise<SendPortalLinkResult> {
  await requireAuthenticatedUser();
  if (channel !== "sms" && channel !== "email") return { ok: false, error: "not_authorized" };
  const staffEmail = (await auth())?.user?.email ?? null;
  const deps = noticeDeps();

  const [client] = await getDb()
    .select({ preferredLanguage: clients.preferredLanguage })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return { ok: false, error: "not_found" };

  // Check everything BEFORE creating the link: a new link revokes the
  // client's previous unused one.
  const settings = await getNotificationSettings(db());
  if (!settings.enabled || !settings.types.portal_link) return { ok: false, error: "disabled" };
  if (!(await availableChannelsForClient(db(), clientId, deps)).includes(channel)) {
    return { ok: false, error: "not_authorized" };
  }
  if (channel === "sms" && !isWithinSmsHours(new Date())) return { ok: false, error: "outside_sms_hours" };

  let link;
  try {
    link = await createPortalAccessLink(db(), { clientId, createdByEmail: staffEmail });
  } catch (err) {
    if (err instanceof PortalAccessError) return { ok: false, error: "no_phone" };
    throw err;
  }
  const url = `${deps.baseUrl}/${client.preferredLanguage}/portal/access#${link.token}`;

  const result = await notifyClient(
    db(),
    {
      type: "portal_link",
      clientId,
      dedupeKey: `portal_link:${clientId}:${randomUUID()}`,
      secretLink: url,
      onlyChannel: channel,
    },
    deps,
  );

  await logAuditEvent({
    action: "portal.link_sent",
    entityType: "client",
    entityId: clientId,
    summary: `Portal access link generated and sent by ${channel} (${result.status}${settings.testMode ? ", test mode" : ""})`,
  });
  revalidatePath(`/clients/${clientId}`);

  if (result.status === "sent") return { ok: true, channel, testMode: settings.testMode };
  if (result.status === "skipped" && result.reason === "test_contact_missing") return { ok: false, error: "test_contact_missing" };
  return { ok: false, error: "send_failed" };
}

export async function revokePortalAccessAction(clientId: string) {
  await requireAuthenticatedUser();
  await revokePortalAccess(db(), clientId);
  await logAuditEvent({
    action: "portal.access_revoked",
    entityType: "client",
    entityId: clientId,
    summary: "Portal access revoked (all links and sessions)",
  });
  revalidatePath(`/clients/${clientId}`);
}

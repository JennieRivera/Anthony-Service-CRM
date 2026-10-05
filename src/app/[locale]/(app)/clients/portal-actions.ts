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

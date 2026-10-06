"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { allianceDocuments } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { requireAccessArea } from "@/lib/permissions";
import { PartnerAccessError, createPartnerAccessLink, revokePartnerAccess } from "@/lib/partners/access";
import type { PortalDb } from "@/lib/portal/db";

// Staff controls for an alliance's partner portal (CRM side). The raw link
// token is returned exactly once, to be copied and sent by WhatsApp.

const db = () => getDb() as unknown as PortalDb;

export async function createPartnerLinkAction(
  allianceId: string,
  locale: "en" | "es",
): Promise<{ ok: true; url: string; expiresAt: string } | { ok: false; error: "no_phone" | "not_found" }> {
  await requireAccessArea("alliances");
  const staffEmail = (await auth())?.user?.email ?? null;
  let link;
  try {
    link = await createPartnerAccessLink(db(), { allianceId, createdByEmail: staffEmail });
  } catch (err) {
    if (err instanceof PartnerAccessError) return { ok: false, error: err.message.includes("phone") ? "no_phone" : "not_found" };
    throw err;
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  // The token goes after "#": browsers never send it to the server.
  const url = `${proto}://${host}/${locale === "en" ? "en" : "es"}/partners/access#${link.token}`;
  await logAuditEvent({
    action: "partner.link_created",
    entityType: "alliance",
    entityId: allianceId,
    summary: `Partner portal link generated (expires ${link.expiresAt.toISOString()})`,
  });
  revalidatePath(`/alliances/${allianceId}`);
  return { ok: true, url, expiresAt: link.expiresAt.toISOString() };
}

export async function revokePartnerAccessAction(allianceId: string) {
  await requireAccessArea("alliances");
  await revokePartnerAccess(db(), allianceId);
  await logAuditEvent({
    action: "partner.access_revoked",
    entityType: "alliance",
    entityId: allianceId,
    summary: "Partner portal access revoked (links and sessions)",
  });
  revalidatePath(`/alliances/${allianceId}`);
}

// "Visible to the partner" on an alliance document.
export async function setAllianceDocumentPartnerVisibilityAction(documentId: string, visible: boolean) {
  await requireAccessArea("alliances");
  const [doc] = await getDb()
    .update(allianceDocuments)
    .set({ visibleToPartner: visible })
    .where(eq(allianceDocuments.id, documentId))
    .returning({ allianceId: allianceDocuments.allianceId, fileName: allianceDocuments.fileName, uploadedByPartner: allianceDocuments.uploadedByPartner });
  if (!doc) return;
  await logAuditEvent({
    action: "partner.document_visibility_changed",
    entityType: "alliance_document",
    entityId: documentId,
    summary: `"${doc.fileName}" ${visible ? "shared with" : "hidden from"} the partner`,
  });
  revalidatePath(`/alliances/${doc.allianceId}`);
}

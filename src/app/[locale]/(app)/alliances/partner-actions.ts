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
import { del } from "@vercel/blob";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { isBlobConfigured } from "@/lib/blob/config";
import { deleteAllianceRecord } from "@/lib/deletion";
import { convertAllianceToActive } from "@/lib/partners/network";

// Staff controls for an alliance's partner portal (CRM side). The raw link
// token is returned exactly once, to be copied and sent by WhatsApp.

const db = () => getDb() as unknown as PortalDb;

export async function createPartnerLinkAction(
  allianceId: string,
  locale: "en" | "es",
): Promise<{ ok: true; url: string; expiresAt: string } | { ok: false; error: "no_phone" | "not_active" | "not_found" }> {
  await requireAccessArea("alliances");
  const staffEmail = (await auth())?.user?.email ?? null;
  let link;
  try {
    link = await createPartnerAccessLink(db(), { allianceId, createdByEmail: staffEmail });
  } catch (err) {
    if (err instanceof PartnerAccessError) {
      return { ok: false, error: err.message.includes("phone") ? "no_phone" : err.message.includes("not active") ? "not_active" : "not_found" };
    }
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

// Admin-only (super_admin/admin) hard delete of an alliance — meant for
// test or mistaken records. For a real ally, archiving (status "inactive"
// + revoking portal access) keeps the history. What goes and what stays is
// in deleteAllianceRecord and spelled out in the confirmation dialog.
export async function deleteAllianceAction(
  allianceId: string,
): Promise<{ ok: true } | { ok: false; reason: "membership_billing" | "linked_records" }> {
  const role = await requireAccessArea("alliances");
  if (role !== "super_admin" && role !== "admin") throw new Error("Forbidden: admin only");

  const result = await deleteAllianceRecord(db(), allianceId);
  if (!result.ok) {
    if (result.reason === "not_found") return { ok: true };
    return { ok: false, reason: result.reason };
  }
  // Documents, photos and logo files (best effort).
  if (isBlobConfigured()) {
    await Promise.all(result.blobUrls.map((url) => del(url).catch(() => undefined)));
  }
  await logAuditEvent({
    action: "alliance.deleted",
    entityType: "alliance",
    entityId: allianceId,
    summary: `Deleted alliance: ${result.name}`,
  });
  revalidatePath("/community");
  revalidatePath("/clients");
  revalidatePath("/referrals");
  revalidatePath("/tasks");
  const locale = await getLocale();
  redirect({ href: "/community", locale });
  return { ok: true };
}

// An alliance another ally added (a Prospect "Added by [ally]") becomes an
// active AMS ally — only then can it get its own portal access.
export async function convertAllianceToActiveAction(allianceId: string): Promise<{ ok: boolean }> {
  await requireAccessArea("alliances");
  const staffEmail = (await auth())?.user?.email ?? null;
  const changed = await convertAllianceToActive(db(), { allianceId, staffEmail });
  if (changed) {
    await logAuditEvent({
      action: "alliance.converted_to_active",
      entityType: "alliance",
      entityId: allianceId,
      summary: "Converted an ally-added prospect into an active ally",
    });
  }
  revalidatePath(`/alliances/${allianceId}`);
  revalidatePath("/alliance-directory");
  revalidatePath("/community");
  return { ok: true };
}

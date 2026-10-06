"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { requireAuthenticatedUser } from "@/lib/permissions";
import { STAFF_CONSENT_METHODS } from "@/lib/legal/texts";
import { STAFF_CHANNEL_AUTHORIZATIONS, recordStaffChannelConsent } from "@/lib/portal/account";
import type { PortalDb } from "@/lib/portal/db";

// The client record's Authorizations card: staff marks a channel permission
// the client gave in person / by phone / in writing / by message. Only the
// five channel permissions — the not-a-law-firm acknowledgment, document
// processing and the privacy notice carry the client's own signature and
// can only be accepted by the client in the portal.
const staffConsentSchema = z.object({
  clientId: z.string().uuid(),
  type: z.enum(STAFF_CHANNEL_AUTHORIZATIONS as [string, ...string[]]),
  granted: z.boolean(),
  method: z.enum(STAFF_CONSENT_METHODS),
  note: z.string().trim().max(500).optional(),
});

export async function recordStaffConsentAction(
  raw: z.input<typeof staffConsentSchema>,
): Promise<{ ok: true } | { ok: false }> {
  await requireAuthenticatedUser();
  const parsed = staffConsentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const { clientId, type, granted, method, note } = parsed.data;
  const staffEmail = (await auth())?.user?.email ?? null;

  await recordStaffChannelConsent(getDb() as unknown as PortalDb, {
    clientId,
    type: type as (typeof STAFF_CHANNEL_AUTHORIZATIONS)[number],
    granted,
    method,
    note: note || null,
    recordedBy: staffEmail,
  });

  await logAuditEvent({
    action: "consent.updated",
    entityType: "client_communication_preferences",
    entityId: clientId,
    summary: `Consent marked by staff (${staffEmail ?? "unknown"}) — ${type}:${granted} via ${method}`,
  });

  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

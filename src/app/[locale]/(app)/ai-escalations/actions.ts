"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aiEscalations, users } from "@/lib/db/schema";
import {
  aiEscalationFormSchema,
  aiEscalationResolutionFormSchema,
  type AiEscalationFormValues,
  type AiEscalationResolutionFormValues,
} from "@/lib/validation/aiEscalation";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { logAuditEvent } from "@/lib/audit";
import { requireAuthenticatedUser } from "@/lib/permissions";

// Escalations are always staff-logged today (section 16 — no live
// conversational AI yet to raise one on its own). This is the manual
// "Escalar a [Agente]" entry point from a client/case profile.
export async function createAiEscalationAction(
  rawValues: AiEscalationFormValues,
) {
  await requireAuthenticatedUser();
  const values = aiEscalationFormSchema.parse(rawValues);
  const db = getDb();

  const [created] = await db
    .insert(aiEscalations)
    .values({
      agentId: values.agentId,
      clientId: values.clientId,
      caseId: values.caseId || null,
      reason: values.reason,
      riskLevel: values.riskLevel,
      status: "open",
    })
    .returning({ id: aiEscalations.id });

  await logAuditEvent({
    action: "ai_escalation.created",
    entityType: "ai_escalation",
    entityId: created.id,
    summary: `AI escalation created (risk: ${values.riskLevel})`,
  });

  revalidatePath("/ai-escalations");
  revalidatePath("/ai-team");
  const locale = await getLocale();
  redirect({ href: `/ai-escalations/${created.id}`, locale });
}

export async function updateAiEscalationResolutionAction(
  id: string,
  rawValues: AiEscalationResolutionFormValues,
) {
  await requireAuthenticatedUser();
  const values = aiEscalationResolutionFormSchema.parse(rawValues);
  const db = getDb();

  // AI Foundation / Security phase — additive structured link alongside
  // the free-text email: when it matches a real users.email, record the
  // FK too, so a future UI can show/filter by an actual user instead of a
  // string. Never required, never blocks saving on a non-matching email
  // (e.g. an external accountant with no CRM login) — the free-text field
  // alone remains fully sufficient, exactly as before this phase.
  const assignedHumanEmail = values.assignedHumanEmail || null;
  let assignedHumanUserId: string | null = null;
  if (assignedHumanEmail) {
    const [matchedUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = lower(${assignedHumanEmail})`)
      .limit(1);
    assignedHumanUserId = matchedUser?.id ?? null;
  }

  await db
    .update(aiEscalations)
    .set({
      status: values.status,
      assignedHumanEmail,
      assignedHumanUserId,
      resolution: values.resolution || null,
      resolutionDate: values.resolutionDate || null,
      updatedAt: new Date(),
    })
    .where(eq(aiEscalations.id, id));

  await logAuditEvent({
    action: "ai_escalation.updated",
    entityType: "ai_escalation",
    entityId: id,
    summary: `AI escalation updated (status: ${values.status})`,
  });

  revalidatePath("/ai-escalations");
  revalidatePath(`/ai-escalations/${id}`);
  revalidatePath("/ai-team");
}

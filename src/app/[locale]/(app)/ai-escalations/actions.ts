"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aiEscalations } from "@/lib/db/schema";
import {
  aiEscalationFormSchema,
  aiEscalationResolutionFormSchema,
  type AiEscalationFormValues,
  type AiEscalationResolutionFormValues,
} from "@/lib/validation/aiEscalation";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { logAuditEvent } from "@/lib/audit";

// Escalations are always staff-logged today (section 16 — no live
// conversational AI yet to raise one on its own). This is the manual
// "Escalar a [Agente]" entry point from a client/case profile.
export async function createAiEscalationAction(
  rawValues: AiEscalationFormValues,
) {
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
  const values = aiEscalationResolutionFormSchema.parse(rawValues);
  const db = getDb();

  await db
    .update(aiEscalations)
    .set({
      status: values.status,
      assignedHumanEmail: values.assignedHumanEmail || null,
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

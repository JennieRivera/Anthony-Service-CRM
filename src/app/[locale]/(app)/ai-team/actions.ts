"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aiAgents, aiAgentKnowledgeBase } from "@/lib/db/schema";
import {
  aiAgentProfileFormSchema,
  aiAgentKnowledgeBaseFormSchema,
  type AiAgentProfileFormValues,
  type AiAgentKnowledgeBaseFormValues,
} from "@/lib/validation/aiAgent";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { logAuditEvent } from "@/lib/audit";

// Pausing an agent only flips its own status flag — it never touches the
// clients/cases/tasks it works over (section 15).
export async function toggleAiAgentPauseAction(id: string) {
  const db = getDb();
  const [agent] = await db
    .select({ status: aiAgents.status })
    .from(aiAgents)
    .where(eq(aiAgents.id, id))
    .limit(1);
  if (!agent) return;

  const nextStatus = agent.status === "paused" ? "online" : "paused";

  await db
    .update(aiAgents)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(aiAgents.id, id));

  revalidatePath("/ai-team");
}

// Section 10's default-deny rule (never delete client records/payments/
// referrals, never touch commission percentages or Admin settings) isn't
// part of this schema — there is no column for any of those, so nothing an
// Admin submits here can ever grant them. Only the 8 real permission
// columns are writable.
export async function updateAiAgentProfileAction(
  id: string,
  rawValues: AiAgentProfileFormValues,
) {
  const values = aiAgentProfileFormSchema.parse(rawValues);
  const db = getDb();

  await db
    .update(aiAgents)
    .set({
      name: values.name,
      title: values.title,
      department: values.department,
      language: values.language,
      avatarStyle: values.avatarStyle,
      accentColor: values.accentColor || null,
      bio: values.bio || null,
      welcomeMessage: values.welcomeMessage || null,
      disclaimerText: values.disclaimerText || null,
      canRead: values.canRead,
      canWrite: values.canWrite,
      canCreateTask: values.canCreateTask,
      canCreateNote: values.canCreateNote,
      canChangeStatus: values.canChangeStatus,
      canSendDraft: values.canSendDraft,
      canSendMessage: values.canSendMessage,
      canEscalate: values.canEscalate,
      updatedAt: new Date(),
    })
    .where(eq(aiAgents.id, id));

  await logAuditEvent({
    action: "ai_agent.profile_updated",
    entityType: "ai_agent",
    entityId: id,
    summary: `Updated profile/permissions for AI agent "${values.name}"`,
  });

  await revalidateAgentPaths(id);

  const [updated] = await db
    .select({ slug: aiAgents.slug })
    .from(aiAgents)
    .where(eq(aiAgents.id, id))
    .limit(1);
  const locale = await getLocale();
  redirect({ href: `/ai-team/${updated?.slug ?? ""}`, locale });
}

export async function createKnowledgeBaseEntryAction(
  agentId: string,
  rawValues: AiAgentKnowledgeBaseFormValues,
) {
  const values = aiAgentKnowledgeBaseFormSchema.parse(rawValues);
  const db = getDb();

  const existingInSection = await db
    .select({ id: aiAgentKnowledgeBase.id })
    .from(aiAgentKnowledgeBase)
    .where(
      and(
        eq(aiAgentKnowledgeBase.agentId, agentId),
        eq(aiAgentKnowledgeBase.section, values.section),
      ),
    );

  await db.insert(aiAgentKnowledgeBase).values({
    agentId,
    section: values.section,
    title: values.title,
    content: values.content,
    sortOrder: existingInSection.length,
  });

  await logAuditEvent({
    action: "ai_agent.knowledge_base_entry_created",
    entityType: "ai_agent_knowledge_base",
    entityId: agentId,
    summary: `Added "${values.title}" (${values.section}) to an AI agent's knowledge base`,
  });

  await revalidateAgentPaths(agentId);
}

export async function updateKnowledgeBaseEntryAction(
  id: string,
  rawValues: AiAgentKnowledgeBaseFormValues,
) {
  const values = aiAgentKnowledgeBaseFormSchema.parse(rawValues);
  const db = getDb();

  const [existing] = await db
    .select({ agentId: aiAgentKnowledgeBase.agentId })
    .from(aiAgentKnowledgeBase)
    .where(eq(aiAgentKnowledgeBase.id, id))
    .limit(1);

  await db
    .update(aiAgentKnowledgeBase)
    .set({
      section: values.section,
      title: values.title,
      content: values.content,
      updatedAt: new Date(),
    })
    .where(eq(aiAgentKnowledgeBase.id, id));

  await logAuditEvent({
    action: "ai_agent.knowledge_base_entry_updated",
    entityType: "ai_agent_knowledge_base",
    entityId: id,
    summary: `Updated knowledge base entry "${values.title}"`,
  });

  if (existing) await revalidateAgentPaths(existing.agentId);
}

export async function deleteKnowledgeBaseEntryAction(id: string) {
  const db = getDb();

  const [existing] = await db
    .select({ agentId: aiAgentKnowledgeBase.agentId })
    .from(aiAgentKnowledgeBase)
    .where(eq(aiAgentKnowledgeBase.id, id))
    .limit(1);

  await db
    .delete(aiAgentKnowledgeBase)
    .where(eq(aiAgentKnowledgeBase.id, id));

  await logAuditEvent({
    action: "ai_agent.knowledge_base_entry_deleted",
    entityType: "ai_agent_knowledge_base",
    entityId: id,
    summary: "Deleted an AI agent knowledge base entry",
  });

  if (existing) await revalidateAgentPaths(existing.agentId);
}

async function revalidateAgentPaths(agentId: string) {
  const db = getDb();
  const [agent] = await db
    .select({ slug: aiAgents.slug })
    .from(aiAgents)
    .where(eq(aiAgents.id, agentId))
    .limit(1);

  revalidatePath("/ai-team");
  if (agent) {
    revalidatePath(`/ai-team/${agent.slug}`);
    revalidatePath(`/ai-team/${agent.slug}/edit`);
  }
}

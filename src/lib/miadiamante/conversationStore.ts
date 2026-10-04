// MIADIAMANTE AI Foundation — Phase 2B-2: conversation persistence.
//
// This is a pure persistence + ownership layer. It has NO knowledge of
// runConversationTurn, ModelTurnProposal, or any tool-calling concept —
// conversationController.ts stays exactly as it was in Phase 2B-1 (zero
// DB access, provider-agnostic), and this file never imports it. A
// future caller (Phase 2B-4) is expected to compose the two: authorize
// ownership here, call the unmodified runConversationTurn, then persist
// its result here — never the other way around, and never merged into
// one file. See the Phase 2B-2 audit report, section 10, for the exact
// composition this is designed to support.
//
// SECURITY (owner-approved design, see the Phase 2B-2 audit):
// - Ownership is ALWAYS resolved server-side from the authenticated
//   session's email (auth()) — never from a function parameter, request
//   body, header, or any other caller-supplied input. Exactly like
//   capabilityRunner.ts, there is structurally no parameter a caller
//   could use to spoof a different identity: no exported function here
//   accepts an email, role, or owner id argument at all.
// - Access hardening (owner decision, post-2B-2 review): a valid session
//   alone is NOT sufficient to create or use a MIADIAMANTE conversation —
//   and neither is "any active, authenticated staff role" (an earlier
//   version of this hardening used authorizeMiadiamanteRead() against
//   "current_user_context.read" as a proxy for general access, but that
//   capability is intentionally ungated for every active role, so it
//   allowed everyone — overridden by a further owner decision).
//   getAuthorizedSessionEmail() below now routes through
//   authorizeMiadiamanteAccess() — a dedicated Layer 1 "may this human
//   use MIADIAMANTE at all" gate added directly to authorize.ts (see
//   that file for the full reasoning), conservatively super_admin-only
//   for this release. This is NOT a second permission system: it lives
//   in the same file, reuses the same Role type and getCurrentRole()
//   resolution (so isActive/deactivated is already covered), and reuses
//   the same DENIAL_MESSAGES copy as every other MIADIAMANTE decision.
//   Capability-level authorization (decideMiadiamanteRead(), Layer 2 —
//   "which individual capability may run for an already-admitted user")
//   is completely unchanged by this.
// - A wrong-owner conversation ID and a nonexistent conversation ID are
//   indistinguishable to the caller — both return the exact same neutral
//   message (NEUTRAL_UNAVAILABLE_MESSAGE, reused verbatim from
//   capabilityRunner.ts, never a second copy of that string).
// - Every read or write of a conversation/message re-runs the ownership
//   check; there is no cached "already verified" state.
// - Fail CLOSED on a database read failure while checking ownership
//   (getOwnedConversation) — a thrown query denies, never allows.
// - Fail OPEN only on the best-effort lastMessageAt touch after a
//   message is already durably inserted — mirrors audit.ts's own "a
//   failure to write a side-effect must never retroactively change an
//   already-computed, already-persisted result" philosophy. This is
//   categorically different from the fail-closed rule above: that one
//   guards an authorization decision, this one is a non-authoritative
//   timestamp update after the authorized write already succeeded.
// - No super_admin override: a super_admin session is subject to the
//   exact same ownerEmail comparison as any other role. Any future
//   administrative oversight capability is explicitly out of scope for
//   this phase (owner decision, Phase 2B-2 approval).
//
// DATA MINIMIZATION (owner-approved): only plain message text, role,
// and an optional single tool name are ever persisted. Never tool
// arguments, never raw tool results, never the underlying client/
// invoice/task/appointment DTOs a capability call returned, never raw
// exception/error text — a failed or denied turn is persisted (if at
// all) using the same neutral copy every other denial in this codebase
// already uses, never the specific underlying reason.

import { getDb } from "@/lib/db";
import {
  miadiamanteConversations,
  miadiamanteMessages,
  users,
  type MiadiamanteConversation,
  type MiadiamanteMessage,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { NEUTRAL_UNAVAILABLE_MESSAGE } from "./capabilityRunner";
import { getMiadiamanteAuthorizedSessionEmail } from "./authorize";

export { NEUTRAL_UNAVAILABLE_MESSAGE };

// The ONE gate every exported function in this file resolves identity
// through. Phase 2B-3 refactor (owner decision): this used to be a
// private copy of this exact logic defined in this file; it now reuses
// the canonical helper in authorize.ts — the same one providerExecutor.ts
// uses — so there is exactly one implementation of "derive identity,
// enforce Layer 1" in the whole codebase, never two drifting copies.
// Behavior is unchanged: a denial (unauthenticated, inactive/
// deactivated, or simply not an authorized role) still collapses to
// null here, and from there to the same NEUTRAL_UNAVAILABLE_MESSAGE
// every other denial in this file already uses.
const getAuthorizedSessionEmail = getMiadiamanteAuthorizedSessionEmail;

// Bounded well below any realistic human-typed message — generous enough
// for a genuine question, far short of anything resembling a pasted
// document. Trimmed first so pure whitespace never counts as content.
export const messageContentSchema = z.string().trim().min(1).max(4000);
export const conversationIdSchema = z.string().uuid();
export const messageRoleSchema = z.enum(["user", "assistant"]);

export interface ConversationAuthResult {
  allowed: boolean;
  message?: string;
}

// Pure, zero I/O — deliberately injectable/testable in isolation, same
// style as decideMiadiamanteRead() in authorize.ts. Both denial branches
// return the identical message so a caller can never distinguish "not
// yours" from "doesn't exist".
export function authorizeConversationAccess(
  conversation: { ownerEmail: string } | null,
  sessionEmail: string | null,
): ConversationAuthResult {
  if (!sessionEmail) {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }
  if (!conversation) {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }
  if (conversation.ownerEmail.toLowerCase() !== sessionEmail.toLowerCase()) {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }
  return { allowed: true };
}

export type ConversationResult<T> =
  | { allowed: true; data: T }
  | { allowed: false; message: string };

// Creates a conversation owned by the current session — but only for a
// role authorizeMiadiamanteAccess() actually admits (see
// getAuthorizedSessionEmail() above; super_admin only for this release).
// A valid login alone is not sufficient. This does not grant any tool/
// capability access by itself, which remains governed entirely by the
// existing, unmodified authorize.ts decideMiadiamanteRead() chain,
// per-capability, exactly as before.
export async function createConversation(
  title?: string,
): Promise<ConversationResult<{ id: string }>> {
  const email = await getAuthorizedSessionEmail();
  if (!email) {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }

  // Advisory-only structured link, same pattern as
  // ai_escalations.assignedHumanUserId — a failure or miss here never
  // blocks conversation creation.
  let ownerUserId: string | null = null;
  try {
    const db = getDb();
    const [userRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    ownerUserId = userRow?.id ?? null;
  } catch {
    ownerUserId = null;
  }

  try {
    const db = getDb();
    const [row] = await db
      .insert(miadiamanteConversations)
      .values({ ownerEmail: email, ownerUserId, title: title ?? null })
      .returning({ id: miadiamanteConversations.id });
    return { allowed: true, data: { id: row.id } };
  } catch {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }
}

// The one place a conversation's ownership is actually checked against
// the database. Every other exported function below calls this first.
export async function getOwnedConversation(
  rawConversationId: unknown,
): Promise<ConversationResult<MiadiamanteConversation>> {
  const idCheck = conversationIdSchema.safeParse(rawConversationId);
  if (!idCheck.success) {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }

  const email = await getAuthorizedSessionEmail();
  if (!email) {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }

  let conversation: MiadiamanteConversation | null = null;
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(miadiamanteConversations)
      .where(eq(miadiamanteConversations.id, idCheck.data))
      .limit(1);
    conversation = row ?? null;
  } catch {
    // FAIL CLOSED — a database read failure while checking ownership
    // must deny, never allow.
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }

  const authResult = authorizeConversationAccess(conversation, email);
  if (!authResult.allowed) {
    return { allowed: false, message: authResult.message ?? NEUTRAL_UNAVAILABLE_MESSAGE };
  }
  return { allowed: true, data: conversation as MiadiamanteConversation };
}

// Appends a message to a conversation the caller owns. Content is
// Zod-validated BEFORE any database call (read or write) — a malformed
// message never reaches the database at all, closed conversations never
// accept new messages, and only a single optional tool name is ever
// accepted as metadata (never arguments, never results).
export async function appendMessage(
  rawConversationId: unknown,
  role: "user" | "assistant",
  rawContent: unknown,
  toolName?: string,
): Promise<ConversationResult<{ id: string }>> {
  const idCheck = conversationIdSchema.safeParse(rawConversationId);
  if (!idCheck.success) {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }
  const roleCheck = messageRoleSchema.safeParse(role);
  if (!roleCheck.success) {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }
  const contentCheck = messageContentSchema.safeParse(rawContent);
  if (!contentCheck.success) {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }

  const owned = await getOwnedConversation(idCheck.data);
  if (!owned.allowed) {
    return owned;
  }
  if (owned.data.status === "closed") {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }

  try {
    const db = getDb();
    const [row] = await db
      .insert(miadiamanteMessages)
      .values({
        conversationId: idCheck.data,
        role: roleCheck.data,
        content: contentCheck.data,
        toolName: toolName ?? null,
      })
      .returning({ id: miadiamanteMessages.id });

    // Fail OPEN — the message is already durably saved; a failure here
    // must never retroactively undo that or surface as an error to the
    // caller. Best-effort only.
    void db
      .update(miadiamanteConversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(miadiamanteConversations.id, idCheck.data))
      .catch(() => {});

    return { allowed: true, data: { id: row.id } };
  } catch {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }
}

// Lists a conversation's messages, oldest first, only for its owner.
export async function listOwnedMessages(
  rawConversationId: unknown,
): Promise<ConversationResult<MiadiamanteMessage[]>> {
  const owned = await getOwnedConversation(rawConversationId);
  if (!owned.allowed) {
    return owned;
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(miadiamanteMessages)
      .where(eq(miadiamanteMessages.conversationId, owned.data.id))
      .orderBy(asc(miadiamanteMessages.createdAt));
    return { allowed: true, data: rows };
  } catch {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }
}

// Closes a conversation the caller owns. No self-service hard delete
// exists in this phase (owner decision) — this is the only lifecycle
// transition exposed.
export async function closeConversation(
  rawConversationId: unknown,
): Promise<ConversationResult<{ id: string }>> {
  const owned = await getOwnedConversation(rawConversationId);
  if (!owned.allowed) {
    return owned;
  }

  try {
    const db = getDb();
    await db
      .update(miadiamanteConversations)
      .set({ status: "closed", updatedAt: new Date() })
      .where(eq(miadiamanteConversations.id, owned.data.id));
    return { allowed: true, data: { id: owned.data.id } };
  } catch {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }
}

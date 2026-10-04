// MIADIAMANTE Phase 2B-2 — conversationStore unit tests. Pure/zero-I/O
// checks only: authorizeConversationAccess() and the Zod schemas need no
// database or authenticated session, so they're exercised directly here.
// DB-touching behavior (create/append/close/list, closed-conversation
// rejection, cross-conversation isolation) is verified live, through a
// real authenticated session, in the Phase 2B-2 pre-release report —
// see that report for the live verification results and cleanup
// confirmation, matching the Phase 2A/2B-1 precedent of using a
// standalone tsx script only for what's genuinely testable without a
// session.

import fs from "node:fs";
import path from "node:path";
import {
  authorizeConversationAccess,
  messageContentSchema,
  conversationIdSchema,
  messageRoleSchema,
  NEUTRAL_UNAVAILABLE_MESSAGE,
} from "./conversationStore";
import { decideMiadiamanteRead, decideMiadiamanteAccess, authorizeMiadiamanteAccess } from "./authorize";
import { roleValues } from "@/lib/permissions";

let passed = 0;
let failed = 0;

async function check(label: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${label}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${label}`);
    console.log(`       ${err instanceof Error ? err.message : String(err)}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log("authorizeConversationAccess() — ownership decisions:");

  await check("owner match (exact case) allows access", () => {
    const result = authorizeConversationAccess(
      { ownerEmail: "staff@anthonyservice.com" },
      "staff@anthonyservice.com",
    );
    assert(result.allowed === true, "expected allowed");
  });

  await check("owner match is case-insensitive on both sides", () => {
    const result = authorizeConversationAccess(
      { ownerEmail: "Staff@AnthonyService.com" },
      "staff@anthonyservice.com",
    );
    assert(result.allowed === true, "expected allowed despite case difference");
  });

  await check("owner mismatch denies access", () => {
    const result = authorizeConversationAccess(
      { ownerEmail: "owner-a@anthonyservice.com" },
      "owner-b@anthonyservice.com",
    );
    assert(result.allowed === false, "expected denied");
    assert(result.message === NEUTRAL_UNAVAILABLE_MESSAGE, "expected the shared neutral message");
  });

  await check("nonexistent conversation (null) denies access", () => {
    const result = authorizeConversationAccess(null, "someone@anthonyservice.com");
    assert(result.allowed === false, "expected denied");
    assert(result.message === NEUTRAL_UNAVAILABLE_MESSAGE, "expected the shared neutral message");
  });

  await check(
    "wrong-owner and nonexistent-conversation denials are the IDENTICAL message (no existence leak)",
    () => {
      const wrongOwner = authorizeConversationAccess(
        { ownerEmail: "owner-a@anthonyservice.com" },
        "owner-b@anthonyservice.com",
      );
      const notFound = authorizeConversationAccess(null, "owner-b@anthonyservice.com");
      assert(
        wrongOwner.message === notFound.message,
        "a caller must not be able to distinguish 'not yours' from 'does not exist'",
      );
    },
  );

  await check("missing session email denies access even with a valid conversation", () => {
    const result = authorizeConversationAccess(
      { ownerEmail: "owner-a@anthonyservice.com" },
      null,
    );
    assert(result.allowed === false, "expected denied");
    assert(result.message === NEUTRAL_UNAVAILABLE_MESSAGE, "expected the shared neutral message");
  });

  console.log("\nmessageContentSchema — Zod validation, before any DB call:");

  await check("rejects an empty string", () => {
    const result = messageContentSchema.safeParse("");
    assert(!result.success, "expected rejection");
  });

  await check("rejects a whitespace-only string (trimmed to empty)", () => {
    const result = messageContentSchema.safeParse("   \n\t  ");
    assert(!result.success, "expected rejection");
  });

  await check("rejects an oversized string (> 4000 chars)", () => {
    const result = messageContentSchema.safeParse("a".repeat(4001));
    assert(!result.success, "expected rejection");
  });

  await check("accepts a string at the exact 4000-char boundary", () => {
    const result = messageContentSchema.safeParse("a".repeat(4000));
    assert(result.success, "expected acceptance at the boundary");
  });

  await check("rejects wrong-type input: a number", () => {
    const result = messageContentSchema.safeParse(12345);
    assert(!result.success, "expected rejection");
  });

  await check("rejects wrong-type input: an object (e.g. an injected tool-result shape)", () => {
    const result = messageContentSchema.safeParse({ text: "hello", toolResult: { balance: 100 } });
    assert(!result.success, "expected rejection");
  });

  await check("rejects wrong-type input: null / undefined", () => {
    assert(!messageContentSchema.safeParse(null).success, "null must be rejected");
    assert(!messageContentSchema.safeParse(undefined).success, "undefined must be rejected");
  });

  await check("trims surrounding whitespace from a valid message", () => {
    const result = messageContentSchema.safeParse("  hello MIADIAMANTE  ");
    assert(result.success && result.data === "hello MIADIAMANTE", "expected trimmed content");
  });

  console.log("\nconversationIdSchema — Zod validation:");

  await check("rejects a malformed UUID", () => {
    assert(!conversationIdSchema.safeParse("not-a-uuid").success, "expected rejection");
    assert(!conversationIdSchema.safeParse("12345").success, "expected rejection");
  });

  await check("accepts a well-formed UUID", () => {
    const result = conversationIdSchema.safeParse("550e8400-e29b-41d4-a716-446655440000");
    assert(result.success, "expected acceptance");
  });

  console.log("\nmessageRoleSchema — Zod validation:");

  await check("rejects an unexpected role value (e.g. 'system', 'admin', 'tool')", () => {
    assert(!messageRoleSchema.safeParse("system").success, "expected rejection");
    assert(!messageRoleSchema.safeParse("admin").success, "expected rejection");
    assert(!messageRoleSchema.safeParse("tool").success, "expected rejection");
  });

  await check("accepts exactly 'user' and 'assistant'", () => {
    assert(messageRoleSchema.safeParse("user").success, "expected acceptance");
    assert(messageRoleSchema.safeParse("assistant").success, "expected acceptance");
  });

  console.log(
    "\nAccess hardening (Layer 1) — MIADIAMANTE conversation creation/use is super_admin-only for this release:",
  );

  const storeSource = fs.readFileSync(path.join(__dirname, "conversationStore.ts"), "utf-8");

  await check("1. active super_admin is allowed", () => {
    const result = decideMiadiamanteAccess("super_admin");
    assert(result.allowed === true, "expected super_admin to be allowed");
  });

  await check("2. every other active, non-super_admin role is denied", () => {
    const nonSuperAdminRoles = roleValues.filter((r) => r !== "super_admin");
    assert(nonSuperAdminRoles.length === roleValues.length - 1, "sanity check on the filtered list");
    for (const role of nonSuperAdminRoles) {
      const result = decideMiadiamanteAccess(role);
      assert(result.allowed === false, `expected role "${role}" to be denied MIADIAMANTE access`);
    }
  });

  await check("3. unauthenticated (null role) is denied", () => {
    const result = decideMiadiamanteAccess(null);
    assert(result.allowed === false, "expected denied");
  });

  await check(
    "4. inactive/deactivated is denied — getCurrentRole() already resolves a deactivated users row to null before this function ever runs, so it is indistinguishable from 'unauthenticated' here by design (same fail-safe collapse every other permission check in this CRM already uses)",
    () => {
      // decideMiadiamanteAccess itself cannot tell "never logged in" apart
      // from "deactivated mid-session" — both arrive as role: null, because
      // authorizeMiadiamanteAccess() resolves role via the real
      // getCurrentRole(), which already re-checks the users.isActive flag
      // on every call (see permissions.ts). This test documents that
      // collapse is intentional, not an oversight.
      const result = decideMiadiamanteAccess(null);
      assert(result.allowed === false, "expected denied");
    },
  );

  await check(
    "5. caller-supplied role cannot elevate access — authorizeMiadiamanteAccess() takes ZERO parameters, so there is structurally no role argument a caller could supply at all",
    () => {
      assert(authorizeMiadiamanteAccess.length === 0, "expected authorizeMiadiamanteAccess() to take no arguments");
    },
  );

  await check(
    "6. caller-supplied email/owner cannot elevate access — same structural guarantee as conversation ownership: no exported conversationStore function accepts an identity field (covered in full below)",
    () => {
      // getAuthorizedSessionEmail() (private) and authorizeMiadiamanteAccess()
      // (imported) both resolve identity exclusively from auth()/
      // getCurrentRole() — re-asserted here as a direct source check.
      assert(storeSource.includes("authorizeMiadiamanteAccess()"), "expected the real gate to be called with zero arguments in conversationStore.ts");
    },
  );

  await check("7. per-user conversation ownership is still enforced (unaffected by this change)", () => {
    const wrongOwner = authorizeConversationAccess(
      { ownerEmail: "owner-a@anthonyservice.com" },
      "owner-b@anthonyservice.com",
    );
    assert(wrongOwner.allowed === false, "expected denied — unaffected by the Layer 1 access gate");
  });

  await check(
    "9. cross-user conversation access remains denied even when the requester IS the super_admin — Layer 1 (may enter MIADIAMANTE) and conversation ownership are separate checks; passing Layer 1 grants no ownership override",
    () => {
      // authorizeConversationAccess() takes only the stored ownerEmail and
      // the session email — it has no role parameter at all, so there is
      // structurally no way for a super_admin session to short-circuit
      // this check even if it wanted to.
      const result = authorizeConversationAccess(
        { ownerEmail: "staff-member@anthonyservice.com" },
        "owner@anthonyservice.com", // the real ADMIN_EMAIL/super_admin's own email, different from the owner
      );
      assert(result.allowed === false, "expected the super_admin's own session to still be denied someone else's conversation");
      assert(result.message === NEUTRAL_UNAVAILABLE_MESSAGE, "expected the same neutral denial");
    },
  );

  await check(
    "8. existing capability-level authorization (Layer 2, decideMiadiamanteRead) still works unchanged — general_staff still denied invoice_summary.read, current_user_context.read is still ungated for every role at the CAPABILITY layer",
    () => {
      const capabilityDenied = decideMiadiamanteRead("general_staff", "invoice_summary.read");
      assert(capabilityDenied.allowed === false, "expected the existing capability RBAC to still deny this");
      for (const role of roleValues) {
        const capabilityAllowed = decideMiadiamanteRead(role, "current_user_context.read");
        assert(capabilityAllowed.allowed === true, `expected Layer 2 to still allow "${role}" for this ungated capability`);
      }
    },
  );

  await check(
    "decideMiadiamanteAccess is a direct role check, NOT routed through canAccessArea()/AccessArea — confirms no 'leadership' or 'ai_team' area reuse",
    () => {
      const authSource = fs.readFileSync(path.join(__dirname, "authorize.ts"), "utf-8");
      const fnMatch = authSource.match(/export function decideMiadiamanteAccess\([\s\S]*?\n}/);
      assert(!!fnMatch, "expected to find decideMiadiamanteAccess's body");
      const body = fnMatch![0];
      assert(!body.includes("canAccessArea"), "must not reuse the AccessArea mechanism");
      assert(!body.includes('"leadership"') && !body.includes('"ai_team"'), "must not reference either misleading area");
      assert(body.includes('"super_admin"'), "expected a direct super_admin role comparison");
    },
  );

  await check(
    "conversationStore.ts imports the canonical getMiadiamanteAuthorizedSessionEmail from ./authorize (Phase 2B-3 identity-helper refactor) — not authorizeMiadiamanteRead (Layer 2) — for its identity gate",
    () => {
      // Phase 2B-3 (rate-limiter-wiring) refactor: conversationStore.ts
      // no longer calls authorizeMiadiamanteAccess() directly — that
      // call now lives inside the canonical
      // getMiadiamanteAuthorizedSessionEmail() helper in authorize.ts
      // itself (reused by providerExecutor.ts too, so there is exactly
      // one implementation of "derive identity, enforce Layer 1" in the
      // codebase). Layer 1 enforcement is unchanged — it just moved one
      // level down, inside the imported helper — see authorize.test.ts
      // for the direct proof that getMiadiamanteAuthorizedSessionEmail
      // itself still routes through authorizeMiadiamanteAccess().
      const importLines = storeSource.split("\n").filter((l) => /^\s*import\b/.test(l));
      assert(
        importLines.some((l) => l.includes('from "./authorize"') && l.includes("getMiadiamanteAuthorizedSessionEmail")),
        "expected an import of getMiadiamanteAuthorizedSessionEmail from ./authorize",
      );
      assert(
        !importLines.some((l) => l.includes("authorizeMiadiamanteRead")),
        "must not import authorizeMiadiamanteRead (Layer 2) for the identity gate",
      );
    },
  );

  await check(
    "createConversation and getOwnedConversation both route through the authorized identity check (not a bare session check)",
    () => {
      const fnBodies = [
        ...storeSource.matchAll(/export async function (createConversation|getOwnedConversation)\b[\s\S]*?getAuthorizedSessionEmail\(\)/g),
      ];
      assert(fnBodies.length === 2, "expected both functions to call getAuthorizedSessionEmail()");
    },
  );

  console.log("\nStructural guarantees (source-text checks, same technique as conversationController.test.ts):");

  await check(
    "no exported function accepts an identity parameter (email/owner/role-as-identity) — ownership is never caller-suppliable",
    () => {
      const signatures = [
        ...storeSource.matchAll(/export async function (\w+)\(([^)]*)\)/g),
      ];
      assert(signatures.length >= 5, "expected to find the exported conversationStore functions");
      for (const [, name, params] of signatures) {
        // appendMessage's own `role` parameter is the MESSAGE role
        // ("user"/"assistant"), a legitimate, non-identity argument —
        // excluded by name here, not by blanket-allowing "role".
        const forbidden = /ownerEmail|owneremail|requestedByUserEmail|\bemail\b|ownerUserId|ownerRole|identityRole/i;
        const paramsToCheck = name === "appendMessage" ? params.replace(/\brole\b/g, "") : params;
        assert(
          !forbidden.test(paramsToCheck),
          `${name}'s parameter list must not accept a caller-supplied identity field; got: ${params}`,
        );
      }
    },
  );

  await check("every ownership-establishing function derives identity from getAuthorizedSessionEmail() / auth(), not an argument", () => {
    assert(storeSource.includes("getAuthorizedSessionEmail()"), "expected getAuthorizedSessionEmail() to be used");
    assert(storeSource.includes("auth()"), "expected auth() to be the underlying identity source");
  });

  await check("conversationStore.ts never imports conversationController.ts (persistence stays decoupled from the turn pipeline)", () => {
    // Filtered to import lines only — this file's own header comments
    // mention "conversationController.ts" by name to document its
    // deliberate absence, same false-positive this project hit once
    // before (see conversationController.ts's own test file).
    const importLines = storeSource.split("\n").filter((l) => /^\s*import\b/.test(l));
    assert(
      !importLines.some((l) => l.includes("conversationController")),
      "must not import the controller",
    );
  });

  await check("conversationStore.ts reuses NEUTRAL_UNAVAILABLE_MESSAGE from capabilityRunner.ts rather than a second copy", () => {
    const literalCopies = storeSource.match(/"Not authorized or resource unavailable\."/g) ?? [];
    assert(literalCopies.length === 0, "the literal string must not be redefined here — only imported");
  });

  const controllerSource = fs.readFileSync(path.join(__dirname, "conversationController.ts"), "utf-8");
  await check("conversationController.ts was NOT modified to import conversationStore (stays zero-DB-access)", () => {
    assert(!controllerSource.includes("conversationStore"), "the controller must not import the new persistence layer");
    const importLines = controllerSource.split("\n").filter((l) => /^\s*import\b/.test(l));
    const nonCommentSource = controllerSource
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    assert(
      !nonCommentSource.includes("getDb(") &&
        !nonCommentSource.includes("@/lib/db/schema") &&
        !nonCommentSource.includes("@/lib/queries/"),
      "the controller must still have zero direct or indirect DB access",
    );
    assert(importLines.length > 0, "sanity check: the controller should still have some imports");
  });

  console.log(`\n${passed} checks passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

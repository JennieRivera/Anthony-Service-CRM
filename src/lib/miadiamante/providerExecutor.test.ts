// MIADIAMANTE Phase 2B-3 — providerExecutor tests: the single choke
// point future MIADIAMANTE provider execution must go through.
//
// HARDENING (post-implementation-review correction): the production
// export, runMiadiamanteProviderRequest(), takes EXACTLY ONE parameter
// (a MiadiamanteModelRequest) — it has no dependency-override parameter
// at all. An earlier version put the identity/rate-limiter/provider
// seam directly on that function (an optional `deps` argument
// defaulting to the real implementations); that was flagged as a real
// risk, because even a defaulted parameter is still something ANY
// caller — not just a test — could technically supply. The seam now
// lives in a PRIVATE, unexported helper, reachable from tests ONLY
// through __executeProviderRequestForTests — a double-underscore,
// explicitly test-only export (see providerExecutor.ts's own header
// comment and providerSafety.ts's prior __resetRateLimitForTests for
// the established precedent). Most tests below call that helper
// directly with explicit, required deps; a dedicated "Hardening" section
// proves the production export itself cannot be made to accept or use
// an override, including via a deliberate TypeScript bypass attempt.
//
// Three test styles, matching this module's own established convention:
// - Pure/injected-deps unit tests (no real session, no real DB, no
//   real provider) via __executeProviderRequestForTests, for the
//   identity/spoofing/call-count/neutral-denial behavior.
// - One real, live-DB integration test (isolated test identity, real
//   checkRateLimit against the shared Neon database, explicit cleanup)
//   for the mandated 21-request proof.
// - Source-text checks for structural invariants (provider.ts stays
//   transport-only, conversationController.ts stays provider-
//   independent, no tool-only path can reach the rate limiter, and now
//   also: no production file imports the test-only escape hatch).

import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  runMiadiamanteProviderRequest,
  __executeProviderRequestForTests,
  type ProviderExecutionResult,
} from "./providerExecutor";
import { NEUTRAL_UNAVAILABLE_MESSAGE } from "./capabilityRunner";
import { checkRateLimit as realCheckRateLimit } from "./providerSafety";
import { getMiadiamanteAuthorizedSessionEmail } from "./authorize";
import { SensitiveDataBlockedError } from "./sensitiveDataGuard";
import type { MiadiamanteModelProvider, MiadiamanteModelRequest } from "./provider";
import { CAPABILITY_REGISTRY } from "./capabilities";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

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

const SAMPLE_REQUEST: MiadiamanteModelRequest = {
  capability: CAPABILITY_REGISTRY["current_user_context.read"],
  authorizedData: { ok: true },
  userMessage: "What can you help me with?",
};

function fakeProvider(impl?: () => Promise<{ text: string }>): {
  provider: MiadiamanteModelProvider;
  callCount: () => number;
} {
  let calls = 0;
  return {
    provider: {
      async generate() {
        calls++;
        if (impl) return impl();
        return { text: "ok" };
      },
    },
    callCount: () => calls,
  };
}

function countingRateLimiter(result: { allowed: boolean }) {
  let calls = 0;
  const capturedEmails: string[] = [];
  return {
    fn: async (email: string) => {
      calls++;
      capturedEmails.push(email);
      return result;
    },
    callCount: () => calls,
    capturedEmails,
  };
}

function testEmail(label: string): string {
  return `miadiamante-2b3-providerexecutor-${label}-${randomUUID()}@ratelimit-test.invalid`;
}

async function deleteEventsFor(email: string): Promise<void> {
  const db = getDb();
  await db.execute(sql`DELETE FROM miadiamante_rate_limit_events WHERE owner_email = ${email.toLowerCase()}`);
}

async function countEventsFor(email: string): Promise<number> {
  const db = getDb();
  const result = await db.execute(sql`SELECT id FROM miadiamante_rate_limit_events WHERE owner_email = ${email.toLowerCase()}`);
  const rows = Array.isArray(result) ? result : (result as { rows: unknown[] }).rows;
  return rows.length;
}

async function main() {
  const providerExecutorSource = fs.readFileSync(path.join(__dirname, "providerExecutor.ts"), "utf-8");

  console.log("Hardening — production export accepts exactly one parameter:");

  await check("[hardening 1] runMiadiamanteProviderRequest's declared arity is exactly 1 (Function.prototype.length)", () => {
    assert(runMiadiamanteProviderRequest.length === 1, `expected exactly 1 declared parameter, got ${runMiadiamanteProviderRequest.length}`);
  });

  await check("[hardening 1] the production export's signature in source has no deps/second parameter", () => {
    const sigMatch = providerExecutorSource.match(/export async function runMiadiamanteProviderRequest\(([^)]*)\)/);
    assert(!!sigMatch, "expected to find the production export's signature");
    const params = sigMatch![1].replace(/,\s*$/, "").trim();
    assert(params === "request: MiadiamanteModelRequest", `expected exactly one parameter, got "${params}"`);
  });

  await check(
    "[hardening 2, 3, 4] a caller that bypasses TypeScript and passes a second (override) argument positionally has ZERO effect — the real identity/limiter/provider chain still runs",
    async () => {
      const maliciousDeps = {
        resolveOwnerEmail: async () => "attacker@evil.example",
        checkRateLimit: async () => ({ allowed: true }),
        getProvider: () => fakeProvider().provider,
      };
      // Deliberately cast past the type system — this simulates a
      // caller trying to exploit the pre-hardening shape at the plain
      // JS runtime level (where extra arguments to a function that
      // never reads them are simply ignored).
      const bypassed = runMiadiamanteProviderRequest as unknown as (
        r: MiadiamanteModelRequest,
        d: unknown,
      ) => Promise<ProviderExecutionResult>;
      const result = await bypassed(SAMPLE_REQUEST, maliciousDeps);
      // In this no-session script, the REAL getMiadiamanteAuthorizedSessionEmail()
      // throws ("headers called outside a request scope"), caught by
      // the outer try/catch -> denied. If the malicious second argument
      // had ANY effect, this would instead be allowed:true via
      // "attacker@evil.example" and the fake always-allow limiter.
      assert(result.allowed === false, "expected the real chain to run and deny, proving the extra argument was never read");
      assert(!result.allowed && result.message === NEUTRAL_UNAVAILABLE_MESSAGE, "expected the normal neutral denial, not a maliciously-allowed result");
    },
  );

  await check("[hardening] the production export calls the real dependencies by name, not through a parameter — no `deps` identifier anywhere in its body", () => {
    const fnMatch = providerExecutorSource.match(/export async function runMiadiamanteProviderRequest\([\s\S]*?\n}/);
    assert(!!fnMatch, "expected to find the production export's body");
    const body = fnMatch![0];
    assert(!/\bdeps\b/.test(body), "expected zero references to a `deps` identifier inside the production export");
    assert(body.includes("getMiadiamanteAuthorizedSessionEmail"), "expected the real identity resolver to be referenced directly");
    assert(body.includes("checkRateLimit"), "expected the real rate limiter to be referenced directly");
    assert(body.includes("getMiadiamanteModelProvider"), "expected the real provider getter to be referenced directly");
  });

  await check("[hardening] the production export itself, called the normal way with just a request, still runs end-to-end and fails closed in this no-session environment", async () => {
    const result = await runMiadiamanteProviderRequest(SAMPLE_REQUEST);
    assert(result.allowed === false, "expected denial (no real session in this script)");
    assert(!result.allowed && result.message === NEUTRAL_UNAVAILABLE_MESSAGE, "expected the shared neutral message");
  });

  console.log("\nIdentity / Layer 1 gating (via __executeProviderRequestForTests, the test-only escape hatch):");

  await check("[req 3] unauthenticated (real resolver, current no-session environment) reaches neither limiter nor provider", async () => {
    const rl = countingRateLimiter({ allowed: true });
    const fp = fakeProvider();
    const result = await __executeProviderRequestForTests(SAMPLE_REQUEST, {
      resolveOwnerEmail: getMiadiamanteAuthorizedSessionEmail, // the REAL resolver — throws in this script (no Next.js request context), caught internally, denied
      checkRateLimit: rl.fn,
      getProvider: () => fp.provider,
    });
    assert(result.allowed === false, "expected denial");
    assert(!result.allowed && result.message === NEUTRAL_UNAVAILABLE_MESSAGE, "expected the shared neutral message");
    assert(rl.callCount() === 0, "expected zero rate-limiter calls");
    assert(fp.callCount() === 0, "expected zero provider calls");
  });

  await check("[req 2] unauthorized role (Layer 1 denies, simulated via a fake resolver returning null) reaches neither limiter nor provider", async () => {
    const rl = countingRateLimiter({ allowed: true });
    const fp = fakeProvider();
    const result = await __executeProviderRequestForTests(SAMPLE_REQUEST, {
      resolveOwnerEmail: async () => null, // same outcome decideMiadiamanteAccess() produces for a non-super_admin role
      checkRateLimit: rl.fn,
      getProvider: () => fp.provider,
    });
    assert(result.allowed === false, "expected denial");
    assert(!result.allowed && result.message === NEUTRAL_UNAVAILABLE_MESSAGE, "expected the shared neutral message");
    assert(rl.callCount() === 0, "expected zero rate-limiter calls");
    assert(fp.callCount() === 0, "expected zero provider calls");
  });

  await check("[req 1, 4, 5] authorized super_admin reaches the limiter with exactly the server-derived email", async () => {
    const derivedEmail = testEmail("identity-check");
    const rl = countingRateLimiter({ allowed: true });
    const fp = fakeProvider();
    const result = await __executeProviderRequestForTests(SAMPLE_REQUEST, {
      resolveOwnerEmail: async () => derivedEmail,
      checkRateLimit: rl.fn,
      getProvider: () => fp.provider,
    });
    assert(result.allowed === true, "expected the request to be allowed");
    assert(rl.callCount() === 1, "expected exactly one rate-limiter call");
    assert(rl.capturedEmails[0] === derivedEmail, "expected the limiter to receive exactly the server-derived email");
  });

  console.log("\nSpoofing protections (request body cannot carry identity):");

  await check("[req 5, 6, 7] MiadiamanteModelRequest has no owner_email/role/max_requests/window_ms field — stapling one on has zero effect", async () => {
    const derivedEmail = testEmail("spoof-check");
    const rl = countingRateLimiter({ allowed: true });
    const fp = fakeProvider();
    const spoofedRequest = {
      ...SAMPLE_REQUEST,
      owner_email: "attacker@evil.example",
      role: "super_admin",
      max_requests: 999999,
      window_ms: 1,
    } as unknown as MiadiamanteModelRequest;

    const result = await __executeProviderRequestForTests(spoofedRequest, {
      resolveOwnerEmail: async () => derivedEmail,
      checkRateLimit: rl.fn,
      getProvider: () => fp.provider,
    });
    assert(result.allowed === true, "expected the request to still succeed via the real derived identity");
    assert(rl.capturedEmails[0] === derivedEmail, "expected the limiter to still receive the server-derived email, never the spoofed one");
    assert(rl.capturedEmails[0] !== "attacker@evil.example", "the spoofed owner_email must never reach the limiter");
  });

  await check("[req 7] the real call site invokes the rate limiter with exactly one argument (the resolved email) — no max_requests/window_ms parameter exists to pass", () => {
    assert(
      /await deps\.checkRateLimit\(ownerEmail\)/.test(providerExecutorSource),
      "expected the rate-limiter call site to pass exactly one argument",
    );
  });

  console.log("\nProvider-call counting:");

  await check("[req 9] allowed request calls the provider exactly once", async () => {
    const fp = fakeProvider();
    await __executeProviderRequestForTests(SAMPLE_REQUEST, {
      resolveOwnerEmail: async () => testEmail("allowed-once"),
      checkRateLimit: async () => ({ allowed: true }),
      getProvider: () => fp.provider,
    });
    assert(fp.callCount() === 1, `expected exactly 1 provider call, got ${fp.callCount()}`);
  });

  await check("[req 7] rate-limit-denied request calls the provider zero times", async () => {
    const fp = fakeProvider();
    const result = await __executeProviderRequestForTests(SAMPLE_REQUEST, {
      resolveOwnerEmail: async () => testEmail("denied-zero"),
      checkRateLimit: async () => ({ allowed: false }),
      getProvider: () => fp.provider,
    });
    assert(result.allowed === false, "expected denial");
    assert(fp.callCount() === 0, "expected zero provider calls");
  });

  await check("[req 8] a rate-limiter THROW (simulated DB/infrastructure failure) never reaches the provider and still returns the normal neutral denial shape, never a raw exception", async () => {
    const fp = fakeProvider();
    const result = await __executeProviderRequestForTests(SAMPLE_REQUEST, {
      resolveOwnerEmail: async () => testEmail("throws-zero"),
      checkRateLimit: async () => {
        throw new Error("simulated DB failure — this message must never reach the caller");
      },
      getProvider: () => fp.provider,
    });
    assert(result.allowed === false, "expected a normal denial result, not a thrown/rejected promise");
    assert(!result.allowed && result.message === NEUTRAL_UNAVAILABLE_MESSAGE, "expected the shared neutral message, never the raw error text");
    assert(fp.callCount() === 0, "expected zero provider calls even on a rate-limiter throw");
  });

  console.log("\nNeutral denial uniformity:");

  await check("[req 8] quota-exceeded (allowed:false) and infrastructure-failure outcomes are indistinguishable from the executor's return value", async () => {
    const quotaResult = await __executeProviderRequestForTests(SAMPLE_REQUEST, {
      resolveOwnerEmail: async () => testEmail("quota-msg"),
      checkRateLimit: async () => ({ allowed: false }),
      getProvider: () => fakeProvider().provider,
    });
    assert(!quotaResult.allowed && quotaResult.message === NEUTRAL_UNAVAILABLE_MESSAGE, "expected the shared neutral message for quota denial");
  });

  await check("[req 11] a SensitiveDataBlockedError thrown by the provider is caught and collapsed into the same neutral denial, never re-thrown or leaked", async () => {
    const fp = fakeProvider(async () => {
      throw new SensitiveDataBlockedError("api_key_or_secret");
    });
    const result = await __executeProviderRequestForTests(SAMPLE_REQUEST, {
      resolveOwnerEmail: async () => testEmail("sensitive-block"),
      checkRateLimit: async () => ({ allowed: true }),
      getProvider: () => fp.provider,
    });
    assert(!result.allowed, "expected denial");
    assert(!result.allowed && result.message === NEUTRAL_UNAVAILABLE_MESSAGE, "expected the shared neutral message, not the sensitive-data-specific one");
    assert(fp.callCount() === 1, "the provider WAS called (that's where the guard lives) — the guard's failure is what's being caught here");
  });

  await check("exactly one rate-limiter check occurs per invocation", async () => {
    const rl = countingRateLimiter({ allowed: true });
    await __executeProviderRequestForTests(SAMPLE_REQUEST, {
      resolveOwnerEmail: async () => testEmail("single-check"),
      checkRateLimit: rl.fn,
      getProvider: () => fakeProvider().provider,
    });
    assert(rl.callCount() === 1, `expected exactly 1 rate-limiter call, got ${rl.callCount()}`);
  });

  console.log("\nCRITICAL LIVE TEST — real database, real rate limiter, fake provider:");

  await check(
    "[req 10] 21st request against the REAL durable rate limiter is denied BEFORE the provider is ever reached (requests 1-20 reach it, 21-25 do not)",
    async () => {
      const email = testEmail("live-21st");
      const fp = fakeProvider();
      try {
        for (let i = 0; i < 25; i++) {
          const result = await __executeProviderRequestForTests(SAMPLE_REQUEST, {
            resolveOwnerEmail: async () => email,
            checkRateLimit: realCheckRateLimit, // the REAL, DB-backed limiter
            getProvider: () => fp.provider, // fake — isolates "was the provider reached" from "is a key configured"
          });
          if (i < 20) {
            assert(result.allowed === true, `expected request ${i + 1} to be allowed`);
          } else {
            assert(result.allowed === false, `expected request ${i + 1} to be denied`);
          }
        }
        assert(fp.callCount() === 20, `expected the provider to be reached exactly 20 times, got ${fp.callCount()}`);
        const storedEvents = await countEventsFor(email);
        assert(storedEvents === 20, `expected exactly 20 rate-limit events stored, got ${storedEvents}`);
      } finally {
        await deleteEventsFor(email);
        const remaining = await countEventsFor(email);
        assert(remaining === 0, "cleanup failed: rows remain for the providerExecutor 21st-request live test identity");
      }
    },
  );

  console.log("\nTool-only quota isolation and structural invariants (source-text checks):");

  const providerSource = fs.readFileSync(path.join(__dirname, "provider.ts"), "utf-8");
  const providerImportLines = providerSource.split("\n").filter((l) => /^\s*import\b/.test(l)).join("\n");

  await check("[req 14] provider.ts remains transport-only — still zero imports of capabilityRunner/authorize/conversationController/getDb/schema, and no new import of checkRateLimit or providerExecutor", () => {
    assert(!providerImportLines.includes("capabilityRunner"), "must not import capabilityRunner");
    assert(!providerImportLines.includes("./authorize") && !providerImportLines.includes('"authorize"'), "must not import authorize.ts");
    assert(!providerImportLines.includes("conversationController"), "must not import conversationController");
    assert(!providerImportLines.includes("providerExecutor"), "must not import providerExecutor.ts (that file imports provider.ts, never the reverse)");
    assert(!providerImportLines.includes("getDb"), "must not import getDb");
    assert(!providerImportLines.includes("@/lib/db/schema"), "must not import the schema");
    assert(!providerSource.includes("checkRateLimit"), "must not reference checkRateLimit anywhere");
  });

  const controllerSource = fs.readFileSync(path.join(__dirname, "conversationController.ts"), "utf-8");
  const controllerImportLines = controllerSource.split("\n").filter((l) => /^\s*import\b/.test(l)).join("\n");

  await check("[req 15] conversationController.ts remains provider-independent — zero imports of provider.ts, providerExecutor.ts, or checkRateLimit", () => {
    assert(!controllerImportLines.includes('from "./provider"'), "must not import provider.ts");
    assert(!controllerImportLines.includes("providerExecutor"), "must not import providerExecutor.ts");
    assert(!controllerSource.includes("checkRateLimit"), "must not reference checkRateLimit anywhere");
  });

  const capabilityRunnerSource = fs.readFileSync(path.join(__dirname, "capabilityRunner.ts"), "utf-8");

  await check("[req 12] capabilityRunner.ts (the tool-only/read capability execution path) never imports providerExecutor.ts or checkRateLimit — tool-only calls structurally cannot consume provider quota", () => {
    assert(!capabilityRunnerSource.includes("providerExecutor"), "must not import providerExecutor.ts");
    assert(!capabilityRunnerSource.includes("checkRateLimit"), "must not reference checkRateLimit anywhere");
  });

  await check("[hardening] no production file imports the test-only escape hatch (__executeProviderRequestForTests)", () => {
    const productionFiles = ["provider.ts", "providerSafety.ts", "conversationController.ts", "capabilityRunner.ts", "conversationStore.ts", "authorize.ts"];
    for (const file of productionFiles) {
      const source = fs.readFileSync(path.join(__dirname, file), "utf-8");
      assert(!source.includes("__executeProviderRequestForTests"), `${file} must never import or reference the test-only escape hatch`);
    }
  });

  console.log("\nIdentity-helper refactor (owner decision 2):");

  const authorizeSource = fs.readFileSync(path.join(__dirname, "authorize.ts"), "utf-8");
  const conversationStoreSource = fs.readFileSync(path.join(__dirname, "conversationStore.ts"), "utf-8");

  await check("[req 13] authorize.ts exports the canonical getMiadiamanteAuthorizedSessionEmail", () => {
    assert(authorizeSource.includes("export async function getMiadiamanteAuthorizedSessionEmail"), "expected the canonical helper to be exported from authorize.ts");
  });

  await check("[req 13] conversationStore.ts no longer defines its own copy — it imports and reuses the canonical helper, and no longer imports auth() directly", () => {
    assert(conversationStoreSource.includes("getMiadiamanteAuthorizedSessionEmail"), "expected conversationStore.ts to import the canonical helper");
    const nonCommentSource = conversationStoreSource
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    assert(!nonCommentSource.includes('from "@/auth"'), "expected conversationStore.ts to no longer import auth() directly (identity resolution now lives solely in authorize.ts)");
  });

  await check("providerExecutor.ts also imports the SAME canonical helper (no second, driftable copy anywhere)", () => {
    assert(providerExecutorSource.includes("getMiadiamanteAuthorizedSessionEmail"), "expected providerExecutor.ts to import the canonical helper from authorize.ts");
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

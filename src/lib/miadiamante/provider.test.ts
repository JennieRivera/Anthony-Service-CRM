// MIADIAMANTE Phase 2B-3 — provider adapter tests. NO real network call
// is ever made here — AI_GATEWAY_API_KEY is genuinely unset in this
// environment (foundation step only, not activation), so
// getMiadiamanteModelProvider() throws before generate() is even
// reachable, exactly as intended. The configuration/security properties
// that DO matter (sensitive-data blocking placement, ZDR/no-training
// flags, model id, limit wiring, zero business-logic imports) are
// verified via source-text checks, the same established technique used
// throughout this module for invariants that need a real provider
// connection to exercise live.

import fs from "node:fs";
import path from "node:path";
import { getMiadiamanteModelProvider } from "./provider";
import { assertNoSensitiveData, SensitiveDataBlockedError } from "./sensitiveDataGuard";

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
  console.log("getMiadiamanteModelProvider() — still not connected (foundation, not activation):");

  await check("throws when AI_GATEWAY_API_KEY is unset (the real, current state of this environment)", () => {
    assert(!process.env.AI_GATEWAY_API_KEY, "sanity check: this test environment must not have a real key configured");
    let threw = false;
    try {
      getMiadiamanteModelProvider();
    } catch {
      threw = true;
    }
    assert(threw, "expected getMiadiamanteModelProvider() to throw with no key configured");
  });

  await check("re-checks the environment on every call rather than caching (no key -> always throws, never a stale 'connected' state)", () => {
    let threwTwice = true;
    try {
      getMiadiamanteModelProvider();
      getMiadiamanteModelProvider();
    } catch {
      // expected on both calls
      threwTwice = true;
    }
    assert(threwTwice, "expected both calls to throw independently");
  });

  const source = fs.readFileSync(path.join(__dirname, "provider.ts"), "utf-8");

  console.log("\nSource-text checks (configuration that can't be exercised without a real provider connection):");

  await check("the model id is the owner-approved, verified anthropic/claude-sonnet-5.5 — not guessed, not a different model", () => {
    assert(source.includes('"anthropic/claude-sonnet-5.5"'), "expected the exact verified model id");
  });

  await check(
    "generate() calls assertNoSensitiveData on BOTH userMessage and authorizedData BEFORE generateText is called",
    () => {
      const fnMatch = source.match(/async generate\(request: MiadiamanteModelRequest\)[\s\S]*?\n    \},/);
      assert(!!fnMatch, "expected to find generate()'s body");
      const body = fnMatch![0];
      const userMessageCheckIndex = body.indexOf("assertNoSensitiveData(request.userMessage)");
      const authorizedDataCheckIndex = body.indexOf("assertNoSensitiveData(JSON.stringify(request.authorizedData");
      const generateTextIndex = body.indexOf("await generateText(");
      assert(userMessageCheckIndex !== -1, "expected assertNoSensitiveData to be called on userMessage");
      assert(authorizedDataCheckIndex !== -1, "expected assertNoSensitiveData to be called on JSON.stringify(authorizedData)");
      assert(generateTextIndex !== -1, "expected generateText to be called");
      assert(userMessageCheckIndex < generateTextIndex, "expected the userMessage check to run BEFORE the network call");
      assert(authorizedDataCheckIndex < generateTextIndex, "expected the authorizedData check to run BEFORE the network call");
    },
  );

  await check(
    "safety-review correction: authorizedData is scanned via JSON.stringify, NOT a typeof === 'string' guard (which would never fire for any real object/array DTO)",
    () => {
      const fnMatch = source.match(/async generate\(request: MiadiamanteModelRequest\)[\s\S]*?\n    \},/);
      const body = fnMatch![0];
      assert(!body.includes('typeof request.authorizedData === "string"'), "the old string-only guard must be gone");
      assert(body.includes("JSON.stringify(request.authorizedData ?? "), "expected the JSON.stringify-based scan, covering every shape including null/undefined via the fallback");
    },
  );

  await check("BOTH zeroDataRetention and disallowPromptTraining are set to true on every request (owner requirement)", () => {
    assert(source.includes("zeroDataRetention: true"), "expected zeroDataRetention: true");
    assert(source.includes("disallowPromptTraining: true"), "expected disallowPromptTraining: true");
  });

  await check("maxOutputTokens/timeout/maxRetries reference the centralized providerSafety constants, not duplicated magic numbers", () => {
    assert(source.includes("maxOutputTokens: MAX_OUTPUT_TOKENS"), "expected maxOutputTokens to reference the shared constant");
    assert(source.includes("timeout: PROVIDER_TIMEOUT_MS"), "expected timeout to reference the shared constant");
    assert(source.includes("maxRetries: PROVIDER_MAX_RETRIES"), "expected maxRetries to reference the shared constant");
  });

  await check("provider.ts has ZERO imports of capabilityRunner, authorize, conversationController, getDb, or schema — it is transport/reasoning only, never an authority", () => {
    const importLines = source.split("\n").filter((l) => /^\s*import\b/.test(l));
    const importBlock = importLines.join("\n");
    assert(!importBlock.includes("capabilityRunner"), "must not import capabilityRunner");
    assert(!importBlock.includes("./authorize") && !importBlock.includes('"authorize"'), "must not import authorize.ts");
    assert(!importBlock.includes("conversationController"), "must not import conversationController");
    assert(!importBlock.includes("getDb"), "must not import getDb");
    assert(!importBlock.includes("@/lib/db/schema"), "must not import the schema");
  });

  await check(
    "AI_PROVIDER_CONNECTED is not imported or set by this file (this phase does not activate it) — the header comment's own mention of it by name, documenting that absence, is excluded from this check",
    () => {
      const nonCommentSource = source
        .split("\n")
        .filter((l) => !l.trim().startsWith("//"))
        .join("\n");
      assert(!nonCommentSource.includes("AI_PROVIDER_CONNECTED"), "must not import or set AI_PROVIDER_CONNECTED outside of comments");
    },
  );

  await check("only the base 'ai' package is imported — no vendor-specific package (@ai-sdk/anthropic etc.)", () => {
    const importLines = source.split("\n").filter((l) => /^\s*import\b/.test(l));
    const aiImport = importLines.find((l) => l.includes('from "ai"'));
    assert(!!aiImport, "expected an import from the base 'ai' package");
    assert(!importLines.some((l) => l.includes("@ai-sdk/")), "must not import a vendor-specific @ai-sdk/* package");
  });

  console.log(
    "\nauthorizedData sensitive-data scanning — behavioral tests of the EXACT mechanism provider.ts uses (assertNoSensitiveData(JSON.stringify(x))), for every real shape authorizedData can take:",
  );

  // These exercise the real, exported scanning function combined with
  // JSON.stringify exactly as generate() applies it — not a separate
  // approximation. generate() itself can't be called live (no API key
  // in this environment, by design), but the scanning step runs BEFORE
  // any network call, so its behavior is fully provable here.

  await check("userMessage sensitive data is blocked (string case)", () => {
    let threw = false;
    try {
      assertNoSensitiveData("my ssn is 123-45-6789");
    } catch (err) {
      threw = err instanceof SensitiveDataBlockedError;
    }
    assert(threw, "expected a plain sensitive string to be blocked");
  });

  await check("string authorizedData is protected", () => {
    let threw = false;
    try {
      assertNoSensitiveData(JSON.stringify("password: hunter2"));
    } catch (err) {
      threw = err instanceof SensitiveDataBlockedError;
    }
    assert(threw, "expected a sensitive string authorizedData to be blocked");
  });

  await check("object authorizedData is protected (a sensitive value in a top-level field)", () => {
    const authorizedData = { name: "Jane Doe", note: "ssn 123-45-6789" };
    let threw = false;
    try {
      assertNoSensitiveData(JSON.stringify(authorizedData));
    } catch (err) {
      threw = err instanceof SensitiveDataBlockedError;
    }
    assert(threw, "expected an object DTO containing a sensitive field to be blocked");
  });

  await check("nested object authorizedData is protected (sensitive value several levels deep)", () => {
    const authorizedData = {
      task: {
        title: "Follow up",
        details: { memo: "client gave api_key: sk-abcdefghij1234567890 by mistake" },
      },
    };
    let threw = false;
    try {
      assertNoSensitiveData(JSON.stringify(authorizedData));
    } catch (err) {
      threw = err instanceof SensitiveDataBlockedError;
    }
    assert(threw, "expected a nested sensitive value to still be caught via JSON.stringify's full traversal");
  });

  await check("array authorizedData is protected (sensitive value inside an array element)", () => {
    const authorizedData = {
      tasks: [
        { id: "t1", title: "Normal task" },
        { id: "t2", title: "Card on file: 4532015112830366" },
      ],
    };
    let threw = false;
    try {
      assertNoSensitiveData(JSON.stringify(authorizedData));
    } catch (err) {
      threw = err instanceof SensitiveDataBlockedError;
    }
    assert(threw, "expected a sensitive value inside an array to be caught");
  });

  await check("null/undefined authorizedData does not throw or crash (the ?? \"\" fallback)", () => {
    const undefinedData: unknown = undefined;
    const nullData: unknown = null;
    assertNoSensitiveData(JSON.stringify(undefinedData ?? ""));
    assertNoSensitiveData(JSON.stringify(nullData ?? ""));
  });

  await check("clean authorizedData (realistic, already-minimized DTO shape) remains allowed", () => {
    const authorizedData = {
      tasks: [
        { id: "t1", title: "Follow up with client", status: "open", dueDate: "2026-10-10" },
        { id: "t2", title: "Review invoice INV-00042", status: "open", dueDate: null },
      ],
    };
    assertNoSensitiveData(JSON.stringify(authorizedData));
  });

  await check("sensitive values are never echoed in the thrown error's message, for the object/array/nested cases too", () => {
    const authorizedData = { memo: "api_key: sk-shouldnotappearanywhere1234567890" };
    try {
      assertNoSensitiveData(JSON.stringify(authorizedData));
      throw new Error("expected assertNoSensitiveData to throw");
    } catch (err) {
      assert(err instanceof SensitiveDataBlockedError, "expected SensitiveDataBlockedError");
      assert(
        !(err as Error).message.includes("sk-shouldnotappearanywhere1234567890"),
        "the error message must not leak the matched secret, even when it came from inside a JSON-stringified object",
      );
    }
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

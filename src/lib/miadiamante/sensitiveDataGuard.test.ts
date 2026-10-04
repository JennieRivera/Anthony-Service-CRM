// MIADIAMANTE Phase 2B-3 — sensitive-data guard tests. Pure/zero-I/O —
// no database, no session, no network call needed.

import {
  findMiadiamanteSensitiveDataReason,
  assertNoSensitiveData,
  SensitiveDataBlockedError,
} from "./sensitiveDataGuard";

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
  console.log("findMiadiamanteSensitiveDataReason() — detection:");

  await check("detects an SSN/ITIN-shaped string (reused from sensitiveDataCheck.ts)", () => {
    assert(findMiadiamanteSensitiveDataReason("my ssn is 123-45-6789") === "ssn_itin", "expected ssn_itin");
  });

  await check("detects a credit-card-shaped string with a valid Luhn checksum (reused from sensitiveDataCheck.ts)", () => {
    assert(findMiadiamanteSensitiveDataReason("card: 4532015112830366") === "credit_card", "expected credit_card");
  });

  await check("detects a password= style string (reused from sensitiveDataCheck.ts)", () => {
    assert(findMiadiamanteSensitiveDataReason("password: hunter2") === "password", "expected password");
  });

  await check("detects an api_key= style string (NEW category, not in sensitiveDataCheck.ts)", () => {
    assert(findMiadiamanteSensitiveDataReason("api_key: abc123xyz") === "api_key_or_secret", "expected api_key_or_secret");
  });

  await check("detects a 'secret:' / 'bearer' style string (NEW category)", () => {
    assert(findMiadiamanteSensitiveDataReason("secret=supersecretvalue") === "api_key_or_secret", "expected api_key_or_secret");
    assert(findMiadiamanteSensitiveDataReason("Authorization: bearer abc.def.ghi") === "api_key_or_secret", "expected api_key_or_secret");
  });

  await check("detects a common API key prefix shape even without a label (NEW category)", () => {
    assert(findMiadiamanteSensitiveDataReason("here is my key sk-abcdefghij1234567890") === "api_key_or_secret", "expected api_key_or_secret");
  });

  await check("returns null for ordinary, non-sensitive text", () => {
    assert(findMiadiamanteSensitiveDataReason("What tasks do I have open this week?") === null, "expected no match");
    assert(findMiadiamanteSensitiveDataReason("Show me the invoice total for case 4521.") === null, "expected no match");
  });

  console.log("\nassertNoSensitiveData() — hard block, not a soft warning:");

  await check("throws SensitiveDataBlockedError for sensitive text", () => {
    let threw = false;
    try {
      assertNoSensitiveData("my password: hunter2");
    } catch (err) {
      threw = err instanceof SensitiveDataBlockedError;
    }
    assert(threw, "expected a SensitiveDataBlockedError to be thrown");
  });

  await check("the thrown error's message never echoes the matched sensitive text", () => {
    try {
      assertNoSensitiveData("api_key: sk-abcdefghij1234567890-should-not-appear");
      throw new Error("expected assertNoSensitiveData to throw");
    } catch (err) {
      assert(err instanceof SensitiveDataBlockedError, "expected SensitiveDataBlockedError");
      const message = (err as SensitiveDataBlockedError).message;
      assert(!message.includes("sk-abcdefghij1234567890"), "the error message must not leak the matched secret text");
    }
  });

  await check("the error exposes the specific reason as a property (for internal/operator use), separate from the neutral message", () => {
    try {
      assertNoSensitiveData("ssn 123-45-6789");
      throw new Error("expected assertNoSensitiveData to throw");
    } catch (err) {
      assert(err instanceof SensitiveDataBlockedError, "expected SensitiveDataBlockedError");
      assert((err as SensitiveDataBlockedError).reason === "ssn_itin", "expected reason to be recorded on the error object");
    }
  });

  await check("does not throw for ordinary text", () => {
    assertNoSensitiveData("Please summarize my upcoming appointments.");
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

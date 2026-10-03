// MIADIAMANTE Phase 2B-3 — audit-timing correction regression tests.
//
// capabilityRunner.ts fundamentally requires a real authenticated session
// (auth()/getCurrentRole()) to exercise meaningfully — its actual
// behavior was always verified LIVE in prior phases (2A, 2B-1), never via
// a standalone script, for that reason. This file does not change that:
// it proves the STRUCTURAL correctness of the fix (the audit write is
// now placed at each function's true final outcome, not optimistically
// at the RBAC-decision step) via source-text checks, the same technique
// already established in conversationController.test.ts and
// conversationStore.test.ts for invariants that don't need a session. A
// live DB-write verification (confirming a malformed-input call now
// produces an outcome:"denied" row) remains pending a working
// authenticated browser session — see the Phase 2B-3 report for that
// known, honestly-disclosed limitation.

import fs from "node:fs";
import path from "node:path";

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
  const source = fs.readFileSync(path.join(__dirname, "capabilityRunner.ts"), "utf-8");

  console.log("Audit-timing correction — the write moved from authorizeAndAudit() to each run* function's true final outcome:");

  await check("authorizeAndAudit()'s own body no longer calls writeMiadiamanteAuditEntry (shaping only, write moved out)", () => {
    const fnMatch = source.match(/async function authorizeAndAudit\([\s\S]*?\n}/);
    assert(!!fnMatch, "expected to find authorizeAndAudit()'s body");
    assert(
      !fnMatch![0].includes("writeMiadiamanteAuditEntry("),
      "authorizeAndAudit() must not write the audit entry itself anymore",
    );
  });

  await check(
    "every run* function writes the audit entry exactly once per return path (19 total: 3+3+4+3+3+3 across the 6 capabilities' return branches)",
    () => {
      const writeCalls = source.match(/void writeMiadiamanteAuditEntry\(/g) ?? [];
      assert(writeCalls.length === 19, `expected exactly 19 write call sites, found ${writeCalls.length}`);
    },
  );

  const runFunctionNames = [
    "runCurrentUserContext",
    "runAuthorizedNavigation",
    "runInvoiceSummary",
    "runFinancialReportSummary",
    "runTaskList",
    "runUpcomingAppointments",
  ];

  for (const name of runFunctionNames) {
    await check(`${name}: the RBAC-denial branch writes the audit entry BEFORE returning (unchanged correctness, now explicit)`, () => {
      const fnMatch = source.match(new RegExp(`export async function ${name}\\([\\s\\S]*?\\n}`));
      assert(!!fnMatch, `expected to find ${name}'s body`);
      const body = fnMatch![0];
      const deniedBranch = body.match(/if \(!result\.allowed\) \{[\s\S]*?\n  \}/);
      assert(!!deniedBranch, `expected to find ${name}'s RBAC-denial branch`);
      assert(
        deniedBranch![0].includes("void writeMiadiamanteAuditEntry(audit)"),
        `expected ${name}'s RBAC-denial branch to write the audit entry`,
      );
    });
  }

  for (const name of ["runInvoiceSummary", "runFinancialReportSummary", "runTaskList", "runUpcomingAppointments"]) {
    await check(
      `${name}: a malformed-input denial now writes outcome:"denied" to the database (the exact bug this phase fixes) — the pre-fix behavior would have already written outcome:"success" at the RBAC step, before Zod ever ran`,
      () => {
        const fnMatch = source.match(new RegExp(`export async function ${name}\\([\\s\\S]*?\\n}`));
        assert(!!fnMatch, `expected to find ${name}'s body`);
        const body = fnMatch![0];
        const malformedBranch = body.match(/if \(!parsed\.success\) \{[\s\S]*?\n  \}/);
        assert(!!malformedBranch, `expected to find ${name}'s malformed-input branch`);
        assert(
          malformedBranch![0].includes('outcome: "denied"') &&
            malformedBranch![0].includes("void writeMiadiamanteAuditEntry(deniedAudit)"),
          `expected ${name}'s malformed-input branch to build AND write a denied audit entry, not just return one`,
        );
      },
    );
  }

  await check(
    "the success path in every run* function writes the ORIGINAL (RBAC-success) audit entry, not a second/different shape",
    () => {
      for (const name of runFunctionNames) {
        const fnMatch = source.match(new RegExp(`export async function ${name}\\([\\s\\S]*?\\n}`));
        assert(!!fnMatch, `expected to find ${name}'s body`);
        const body = fnMatch![0];
        const successReturn = body.match(/void writeMiadiamanteAuditEntry\(audit\);\s*\n\s*return \{ allowed: true/);
        assert(!!successReturn, `expected ${name}'s success path to write the original audit object immediately before returning allowed:true`);
      }
    },
  );

  console.log(`\n${passed} checks passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

// Regression test for the Server Action auth guard sweep. A Server Action
// can be invoked by POSTing its action ID to ANY page route — including a
// public one like /login or /book — so proxy.ts's login redirect is not
// enough on its own. This statically walks every "use server" file under
// src/ and fails if any Server Action (an exported function in a
// file-level "use server" module, or an inline function with its own
// "use server" directive) doesn't call one of the permission guards.
// Same dependency-free style as the MIADIAMANTE tests: Node's `assert`,
// run directly via `tsx`. Zero DB access, zero network.
//
// Run with:
//   npx tsx src/lib/serverActionGuards.test.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const GUARD_CALL = /\b(requireAuthenticatedUser|requireAccessArea|getCurrentRole)\s*\(/;

// Each exemption must say why. Keep this list as short as possible.
const EXEMPT = new Set([
  // Exposes no data, and must keep working for a user whose access was
  // just revoked (getCurrentRole() returns null for them).
  "src/components/shell/actions.ts::signOutAction",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

function isDirective(statement: ts.Statement | undefined, text: string) {
  return (
    !!statement &&
    ts.isExpressionStatement(statement) &&
    ts.isStringLiteral(statement.expression) &&
    statement.expression.text === text
  );
}

const root = process.cwd();
const unguarded: string[] = [];
let checked = 0;

for (const file of walk(path.join(root, "src"))) {
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes("use server")) continue;
  const rel = path.relative(root, file).split(path.sep).join("/");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fileLevel = isDirective(sf.statements[0], "use server");

  const check = (name: string, body: ts.Node | undefined) => {
    checked++;
    const key = `${rel}::${name}`;
    if (EXEMPT.has(key)) return;
    if (!body || !GUARD_CALL.test(body.getText(sf))) unguarded.push(key);
  };

  const visit = (node: ts.Node) => {
    if (fileLevel && node.parent === sf) {
      const exported = ts.canHaveModifiers(node) &&
        ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (exported && ts.isFunctionDeclaration(node)) check(node.name?.text ?? "default", node.body);
      if (exported && ts.isVariableStatement(node)) {
        for (const d of node.declarationList.declarations) {
          if (d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) {
            check(d.name.getText(sf), d.initializer.body);
          }
        }
      }
    } else if (
      !fileLevel &&
      (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
      node.body &&
      ts.isBlock(node.body) &&
      isDirective(node.body.statements[0], "use server")
    ) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      check(`${node.name?.getText(sf) ?? "inline"}@${line}`, node.body);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

assert.ok(checked > 100, `expected to find the CRM's Server Actions, found only ${checked}`);
assert.deepEqual(unguarded, [], `Server Actions without an auth guard:\n  ${unguarded.join("\n  ")}`);

console.log(`serverActionGuards.test.ts: all ${checked} Server Actions are guarded (${EXEMPT.size} documented exemption).`);

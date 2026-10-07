// The alliance "Activity" in the page language: every partner-portal /
// Diamante Conecta 360 / alliance action written in the code has a sentence
// in both languages, and the useful detail is kept.
//
// Run with:
//   npx tsx src/lib/auditLocalize.test.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { auditDetail, auditMessageKey, localizeAuditSummary } from "./auditLocalize";

const messages = (locale: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"));
const es = messages("es");
const en = messages("en");

// Tiny ICU "select" stand-in, enough for {detail, select, none {A} other {A: {detail}}}.
const translator = (m: Record<string, string>) => {
  const t = (key: string, values?: Record<string, string>) => {
    const msg = m[key];
    const match = msg.match(/^\{detail, select, none \{(.*)\} other \{(.*)\}\}$/);
    if (!match) return msg;
    return values?.detail && values.detail !== "none" ? match[2].replace("{detail}", values.detail) : match[1];
  };
  t.has = (key: string) => key in m;
  return t;
};

// Every action the code writes for alliances has both translations.
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const actions = new Set<string>();
for (const file of walk(path.join(process.cwd(), "src")).filter((f) => /\.(ts|tsx)$/.test(f))) {
  for (const m of fs.readFileSync(file, "utf8").matchAll(/action: "((?:partner|alliance|conecta)\.[a-z_.]+)"/g)) actions.add(m[1]);
}
assert.ok(actions.size > 30);
for (const a of actions) {
  assert.ok(es.AuditActions[auditMessageKey(a)], `missing es AuditActions.${auditMessageKey(a)}`);
  assert.ok(en.AuditActions[auditMessageKey(a)], `missing en AuditActions.${auditMessageKey(a)}`);
}

assert.equal(auditDetail('Alliance uploaded "w9.pdf" (w9)'), "w9.pdf");
assert.equal(auditDetail("Alliance added a service in the partner portal: Tile install"), "Tile install");
assert.equal(auditDetail("Alliance signed in to Diamante Conecta 360 with an email code"), "");

assert.equal(
  localizeAuditSummary({ action: "partner.email_login", summary: "Alliance signed in to Diamante Conecta 360 with an email code" }, translator(es.AuditActions)),
  "El aliado entró a Diamante Conecta 360 con un código de correo",
);
assert.equal(
  localizeAuditSummary({ action: "partner.service_added", summary: "Alliance added a service in the partner portal: Tile install" }, translator(es.AuditActions)),
  "El aliado agregó un servicio: Tile install",
);
// Unknown actions keep the stored text.
assert.equal(localizeAuditSummary({ action: "something.else", summary: "Stored text" }, translator(es.AuditActions)), "Stored text");

console.log(`auditLocalize.test.ts: ${actions.size} alliance actions translated in en and es.`);

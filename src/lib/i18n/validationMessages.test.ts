// Every validation message written in the Zod schemas (src/lib/validation)
// has a Spanish and an English translation, so no form shows "Title is
// required" on /es. Dependency-free, run via `tsx`.
//
// Run with:
//   npx tsx src/lib/i18n/validationMessages.test.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { GENERIC_VALIDATION_KEY, isZodDefaultMessage, validationMessageKey } from "./validationMessages";

const root = process.cwd();
const messages = (locale: string) => JSON.parse(fs.readFileSync(path.join(root, "messages", `${locale}.json`), "utf8"));
const en = messages("en").ValidationMessages as Record<string, string>;
const es = messages("es").ValidationMessages as Record<string, string>;

// Custom messages in the schemas: `message: "…"`, `.min(1, "…")`,
// `.refine(fn, "…")`, `.email("…")` — sentences starting with a capital.
const dir = path.join(root, "src", "lib", "validation");
const found = new Set<string>();
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
  const src = fs.readFileSync(path.join(dir, file), "utf8");
  for (const re of [/message:\s*"([^"]+)"/g, /,\s*"([^"]+)"\s*,?\s*\)/g, /\.(?:email|url|uuid)\(\s*"([^"]+)"\s*\)/g]) {
    for (const m of src.matchAll(re)) {
      const text = m[1];
      // Internal-only (never shown in a form) or not a sentence.
      if (!/^[A-Z]/.test(text) || text === "USD" || text.startsWith("super_admin")) continue;
      found.add(text);
    }
  }
}
assert.ok(found.size > 50, `expected the schema messages, found ${found.size}`);

const missing = [...found].filter((m) => !en[validationMessageKey(m)] || !es[validationMessageKey(m)]);
assert.deepEqual(missing, [], "schema messages without a translation in messages → ValidationMessages");

// Spanish is really Spanish (not the English copied over).
for (const m of found) {
  const key = validationMessageKey(m);
  assert.notEqual(es[key].replace(/\.$/, ""), m.replace(/\.$/, ""), `es ${key}`);
}

// Zod's own messages fall back to "check this field" in both languages.
assert.ok(en[GENERIC_VALIDATION_KEY] && es[GENERIC_VALIDATION_KEY]);
assert.ok(isZodDefaultMessage("Invalid input: expected string, received undefined"));
assert.ok(isZodDefaultMessage("Invalid option: expected one of \"a\"|\"b\""));
assert.ok(!isZodDefaultMessage("Title is required"));
assert.equal(es[validationMessageKey("Title is required")], "Escriba un título.");

console.log(`validationMessages.test.ts: ${found.size} schema messages translated in en and es.`);

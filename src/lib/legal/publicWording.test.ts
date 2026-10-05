// Florida Statutes §117.05(11) wording guard. A non-attorney notary may
// not translate "Notary Public" literally (e.g. "notario", "notario
// público", "notaría") nor use titles like "immigration consultant /
// assistant / specialist". This test scans every message namespace the
// PUBLIC sees (/book, the client portal, and the privacy page once it
// exists) plus the default legal texts, in English and Spanish, and fails
// on any forbidden term. Accents and letter case are ignored.
//
// Run with:
//   npx tsx src/lib/legal/publicWording.test.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_LEGAL_TEXTS } from "./keys";

// Message namespaces rendered on public / client-facing pages.
const PUBLIC_NAMESPACES = ["Book", "Portal", "PublicServiceType", "AppointmentType", "Privacy"];

const FORBIDDEN = [
  /\bnotario\b/,
  /\bnotarios\b/,
  /\bnotaria\b/, // "notaría" once accents are stripped
  /\bnotarias\b/,
  /\bimmigration (consultant|assistant|specialist)s?\b/,
  /\b(consultor|consultora|asistente|especialista)(es|s)? (de|en) inmigracion\b/,
];
// Spanish only: "notarial" reads as a translation of "Notary Public" in
// Spanish, while it is ordinary English ("notarial act").
const FORBIDDEN_ES_ONLY = [/\bnotarial(es)?\b/];

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function strings(value: unknown, at: string, out: [string, string][] = []): [string, string][] {
  if (typeof value === "string") out.push([at, value]);
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) strings(v, `${at}.${k}`, out);
  }
  return out;
}

const violations: string[] = [];
let checked = 0;

for (const locale of ["en", "es"] as const) {
  const messages = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"),
  ) as Record<string, unknown>;
  const sources: [string, string][] = PUBLIC_NAMESPACES.flatMap((ns) =>
    ns in messages ? strings(messages[ns], `${locale}:${ns}`) : [],
  );
  for (const [key, text] of Object.entries(DEFAULT_LEGAL_TEXTS)) {
    sources.push([`${locale}:DEFAULT_LEGAL_TEXTS.${key}`, text[locale]]);
  }
  const rules = locale === "es" ? [...FORBIDDEN, ...FORBIDDEN_ES_ONLY] : FORBIDDEN;
  for (const [where, text] of sources) {
    checked++;
    const n = normalize(text);
    for (const rule of rules) if (rule.test(n)) violations.push(`${where}: "${text}"`);
  }
}

// The rule itself must work (guards against a broken regex passing silently).
assert.ok(FORBIDDEN.some((r) => r.test(normalize("Servicios de Notaría"))));
assert.ok(FORBIDDEN.some((r) => r.test(normalize("Notario Público"))));
assert.ok(FORBIDDEN.some((r) => r.test(normalize("Immigration Consultant"))));
assert.ok(FORBIDDEN.some((r) => r.test(normalize("consultor de inmigración"))));
assert.ok(!FORBIDDEN.some((r) => r.test(normalize("Notary Public de Florida — certificación de firmas"))));

assert.ok(checked > 100, `expected the public message strings, found only ${checked}`);
assert.deepEqual(violations, [], `Forbidden §117.05(11) wording on public pages:\n  ${violations.join("\n  ")}`);

console.log(`publicWording.test.ts: ${checked} public strings checked — no forbidden §117.05(11) wording.`);

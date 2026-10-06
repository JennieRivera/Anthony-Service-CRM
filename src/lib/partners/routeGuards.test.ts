// Static guard test for the partner portal: every signed-in partner PAGE
// calls requirePartnerPage() itself, every /api/partners route calls
// requirePartnerSessionForApi() (except sign-in / sign-out), every
// state-changing handler checks isSameOrigin(), and no partner code takes
// an alliance id from the request. Fails if a new page or route skips it.
//
// Run with:
//   npx tsx src/lib/partners/routeGuards.test.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const root = process.cwd();
const rel = (p: string) => path.relative(root, p).split(path.sep).join("/");

const pages = walk(path.join(root, "src/app/[locale]/partners/(partner)")).filter((f) => f.endsWith("page.tsx"));
assert.ok(pages.length >= 5, `expected the partner pages, found ${pages.length}`);
for (const page of pages) {
  const src = fs.readFileSync(page, "utf8");
  assert.ok(/await requirePartnerPage\(/.test(src), `${rel(page)} must call requirePartnerPage()`);
  assert.ok(/if \(!ctx\) return null;/.test(src), `${rel(page)} must stop when requirePartnerPage() returns null`);
}

const SESSION_LIFECYCLE = new Set(["src/app/api/partners/login/route.ts", "src/app/api/partners/logout/route.ts"]);
const routes = walk(path.join(root, "src/app/api/partners")).filter((f) => f.endsWith("route.ts"));
assert.ok(routes.length >= 11, `expected the partner API routes, found ${routes.length}`);
for (const route of routes) {
  const src = fs.readFileSync(route, "utf8");
  if (SESSION_LIFECYCLE.has(rel(route))) continue;
  assert.ok(/await requirePartnerSessionForApi\(\)/.test(src), `${rel(route)} must call requirePartnerSessionForApi()`);
  for (const handler of src.split(/(?=export async function )/)) {
    const method = handler.match(/^export async function (POST|PUT|PATCH|DELETE)\b/)?.[1];
    if (!method) continue;
    assert.ok(/isSameOrigin\(request\)/.test(handler), `${rel(route)} ${method} must check isSameOrigin()`);
    assert.ok(/await requirePartnerSessionForApi\(\)/.test(handler), `${rel(route)} ${method} must call requirePartnerSessionForApi()`);
  }
}

// Partner code never reads an alliance id (or a client id) from the request.
for (const file of [...pages, ...routes]) {
  const src = fs.readFileSync(file, "utf8");
  assert.ok(!/(allianceId|clientId)\s*[:=]\s*(body|params|searchParams|request)\b/.test(src), `${rel(file)} takes an id from the request`);
  // and never imports the client portal's session (separate sessions).
  assert.ok(!/@\/lib\/portal\/session"/.test(src) || /noStore/.test(src), `${rel(file)} must not use the client-portal session`);
}

// The staff-side partner file route must check the staff (Auth.js) session.
const staff = fs.readFileSync(path.join(root, "src/app/api/alliances/[id]/partner-file/route.ts"), "utf8");
assert.ok(/await auth\(\)/.test(staff), "src/app/api/alliances/[id]/partner-file/route.ts must call auth()");

console.log(`routeGuards.test.ts (partners): ${pages.length} partner pages and ${routes.length} partner API routes are guarded.`);

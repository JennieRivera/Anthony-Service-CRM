// Static guard test for the client portal: every signed-in portal PAGE
// must call requirePortalPage() itself (a layout's check alone doesn't
// protect a page in the App Router), and every /api/portal route must
// call requirePortalSessionForApi() — except the two that create or end a
// session. Fails if someone adds a portal page or route without a guard.
//
// Run with:
//   npx tsx src/lib/portal/routeGuards.test.ts

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

const pages = walk(path.join(root, "src/app/[locale]/portal/(client)")).filter((f) => f.endsWith("page.tsx"));
assert.ok(pages.length >= 5, `expected the portal pages, found ${pages.length}`);
for (const page of pages) {
  const src = fs.readFileSync(page, "utf8");
  assert.ok(/await requirePortalPage\(/.test(src), `${rel(page)} must call requirePortalPage()`);
  assert.ok(/if \(!ctx\) return null;/.test(src), `${rel(page)} must stop when requirePortalPage() returns null`);
}

const SESSION_LIFECYCLE = new Set(["src/app/api/portal/login/route.ts", "src/app/api/portal/logout/route.ts"]);
const routes = walk(path.join(root, "src/app/api/portal")).filter((f) => f.endsWith("route.ts"));
assert.ok(routes.length >= 7, `expected the portal API routes, found ${routes.length}`);
for (const route of routes) {
  const src = fs.readFileSync(route, "utf8");
  if (SESSION_LIFECYCLE.has(rel(route))) continue;
  assert.ok(/await requirePortalSessionForApi\(\)/.test(src), `${rel(route)} must call requirePortalSessionForApi()`);
  // Every state-changing portal route also requires a same-origin request.
  if (/export async function POST/.test(src)) {
    assert.ok(/isSameOrigin\(request\)/.test(src), `${rel(route)} POST must check isSameOrigin()`);
  }
}

// Portal code never reads a client id from the request — only from the session.
for (const file of [...pages, ...routes]) {
  const src = fs.readFileSync(file, "utf8");
  assert.ok(!/clientId\s*[:=]\s*(body|params|searchParams|request)\b/.test(src), `${rel(file)} takes a clientId from the request`);
}

console.log(`routeGuards.test.ts: ${pages.length} portal pages and ${routes.length} portal API routes are guarded.`);

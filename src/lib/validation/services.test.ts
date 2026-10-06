// The single services list (src/lib/validation/client.ts) drives the
// Services menu, a case's "Service type" and the portal. These checks keep
// them from drifting apart again. Dependency-free, run via `tsx`.
//
// Run with:
//   npx tsx src/lib/validation/services.test.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  LEGACY_SERVICE_TYPES,
  activeServiceTypeValues,
  serviceTypeOptions,
  serviceTypeValues,
} from "./client";
import { SERVICES_DRAWER_SECTIONS } from "@/components/shell/nav-drawers";
import { PORTAL_SERVICE_TYPES } from "@/lib/portal/account";
import { DEFAULT_BOOKABLE_SERVICE_DURATIONS } from "@/lib/booking/config";
import { PARTNER_SERVICES } from "./case";
import { organizationTypeValues } from "./alliance";

const messages = (locale: string) =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"));

// Every service has a CRM name and a public name in both languages.
for (const locale of ["en", "es"]) {
  const m = messages(locale);
  for (const s of serviceTypeValues) {
    assert.ok(m.ServiceType[s], `${locale} ServiceType.${s}`);
    assert.ok(m.PublicServiceType[s], `${locale} PublicServiceType.${s}`);
  }
  // Public names say "Notary Public" — never notario/notaría.
  assert.ok(!/notari[oa]|notaría/i.test(JSON.stringify(m.PublicServiceType)), `${locale} public names`);
}

// The legacy type is never offered for new records, only kept for old ones.
assert.deepEqual(LEGACY_SERVICE_TYPES, ["online_notary"]);
assert.ok(!activeServiceTypeValues.includes("online_notary"));
assert.ok(!serviceTypeOptions().includes("online_notary"));
assert.ok(serviceTypeOptions("online_notary").includes("online_notary"));

// The menu offers every current service exactly once: a "new case" link per
// service, except Notary Public + Document Preparation which share the
// two-button chooser. No link opens /cases/new without a service.
const links = SERVICES_DRAWER_SECTIONS[0].links;
const inMenu = links.flatMap((l) => (l.serviceType ? [l.serviceType] : []));
assert.deepEqual(
  [...inMenu, "notary", "document_prep"].sort(),
  [...activeServiceTypeValues].sort(),
);
for (const l of links) {
  if (l.serviceType) assert.equal(l.href, `/cases/new?serviceType=${l.serviceType}`);
}
assert.ok(links.some((l) => l.href === "/cases/new?choose=notary_documents"));
assert.ok(links.some((l) => l.href.startsWith("/referrals/new")));
assert.ok(!links.some((l) => l.href === "/cases/new"));

// The portal offers the same current services; the three new ones are not
// bookable online by default.
assert.deepEqual([...PORTAL_SERVICE_TYPES], [...activeServiceTypeValues]);
for (const s of ["crm_technology", "corporate_events", "remodeling"] as const) {
  assert.ok(PORTAL_SERVICE_TYPES.includes(s));
  assert.equal(DEFAULT_BOOKABLE_SERVICE_DURATIONS[s], undefined);
}

// Partner-based services pick their ally from the matching alliance types
// (Remodeling: general contractors and installers together).
assert.deepEqual([...PARTNER_SERVICES.remodeling.allianceTypes], ["contractor_remodeling", "installer_remodeling"]);
assert.deepEqual([...PARTNER_SERVICES.corporate_events.allianceTypes], ["chef_culinary"]);
for (const { allianceTypes } of Object.values(PARTNER_SERVICES)) {
  for (const allianceType of allianceTypes) {
    assert.ok((organizationTypeValues as readonly string[]).includes(allianceType));
    for (const locale of ["en", "es"]) assert.ok(messages(locale).OrganizationType[allianceType]);
  }
}
for (const locale of ["en", "es"]) {
  for (const service of Object.keys(PARTNER_SERVICES)) {
    for (const key of ["title", "hint", "field", "none", "noAlly", "noneOfType", "showAll", "onlyType", "createReferral"]) {
      assert.ok(messages(locale).Cases.partners[service][key], `${locale} Cases.partners.${service}.${key}`);
    }
  }
}

console.log("services.test.ts: all services-list assertions passed.");

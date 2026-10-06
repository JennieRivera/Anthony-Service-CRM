// Documents archive folders: one per service of the single list (same as
// the Services menu) + Clients, Alliances, Referrals, Other; every
// document in exactly one folder by where it was uploaded. Run via `tsx`.
//
// Run with:
//   npx tsx src/lib/validation/documentDrawer.test.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { activeServiceTypeValues } from "./client";
import {
  GENERAL_FOLDERS,
  SERVICE_FOLDERS,
  defaultClientUploadFolder,
  documentFolder,
  drawerValues,
} from "./documentDrawer";

const messages = (locale: string) =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"));

// Folders = the services list (same order) + the four general folders.
assert.deepEqual([...SERVICE_FOLDERS], [...activeServiceTypeValues]);
assert.deepEqual([...drawerValues], [...activeServiceTypeValues, ...GENERAL_FOLDERS]);
assert.equal(SERVICE_FOLDERS.length, 16);
for (const locale of ["en", "es"]) {
  for (const g of GENERAL_FOLDERS) assert.ok(messages(locale).DocumentDrawer[g], `${locale} DocumentDrawer.${g}`);
}

const base = { referralId: null, serviceType: null, caseServiceType: null, folder: null, category: "signed_forms" };

// Where it was uploaded decides the folder.
assert.equal(documentFolder({ ...base, referralId: "r1", serviceType: "tax_prep" }), "referidos");
assert.equal(documentFolder({ ...base, serviceType: "academy" }), "academy");
assert.equal(documentFolder({ ...base, caseServiceType: "document_prep" }), "document_prep");
assert.equal(documentFolder({ ...base, caseServiceType: "online_notary" }), "notary");
assert.equal(documentFolder({ ...base, folder: "intake" }), "immigration");
assert.equal(documentFolder({ ...base, category: "other" }), "otros");
assert.equal(documentFolder(base), "clientes");
// "Move to…" (explicit folder) wins over the case's service.
assert.equal(documentFolder({ ...base, serviceType: "academy", caseServiceType: "tax_prep" }), "academy");

// Default "Service / folder" on the client record.
assert.equal(defaultClientUploadFolder(["tax_prep"], ["academy"]), "tax_prep");
assert.equal(defaultClientUploadFolder(["tax_prep", "notary"], ["academy"]), "academy");
assert.equal(defaultClientUploadFolder([], ["academy"]), "academy");
assert.equal(defaultClientUploadFolder([], ["online_notary"]), null);
assert.equal(defaultClientUploadFolder([], null), null);

console.log("documentDrawer.test.ts: all archive-folder assertions passed.");

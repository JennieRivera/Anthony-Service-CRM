// Export / import safety checks: masking of sensitive numbers, CSV import
// validation and duplicate detection, the owner-only permission, and that
// the CSV / PDF / Word writers produce real files. No database, no network.
//
// Run with:
//   npx tsx src/lib/export/export.test.ts

import assert from "node:assert/strict";
import { maskSensitive } from "./mask";
import { renderCsv } from "./csv";
import { renderPdf } from "./pdf";
import { renderDocx } from "./docx";
import { usDate, type ExportDoc } from "./document";
import { exportTranslator } from "./translator";
import { findDuplicates, mapHeader, validateImportRow } from "@/lib/import/clients";
import { canAccessArea } from "@/lib/permissions";

let passed = 0;
async function ok(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed += 1;
  console.log(`PASS  ${name}`);
}

async function main() {
  await ok("masks SSN/ITIN, A-numbers, receipt numbers and long card/account numbers", () => {
    assert.equal(maskSensitive("SSN 123-45-6789 ok"), "SSN •••-••-•••• ok");
    assert.equal(maskSensitive("ITIN 912 70 1234"), "ITIN •••-••-••••");
    assert.equal(maskSensitive("A-number A123456789"), "A-number A-•••••••••");
    assert.equal(maskSensitive("receipt IOE0912345678"), "receipt •••••••••••••");
    assert.equal(maskSensitive("card 4111 1111 1111 1111"), "card ••••••••••••1111");
    assert.equal(maskSensitive("acct 0012345678901"), "acct •••••••••8901");
  });
  await ok("leaves phone numbers, dates and money alone", () => {
    for (const s of ["(407) 555-0108", "407-555-0108", "4075550108", "10/06/2026", "$1,250.00", "Case 2026"]) {
      assert.equal(maskSensitive(s), s);
    }
  });

  await ok("US date format", () => {
    assert.equal(usDate("2026-10-06"), "10/06/2026");
  });

  await ok("only super_admin/admin can export or import — manager's '*' does not imply it", () => {
    assert.ok(canAccessArea("super_admin", "data_export"));
    assert.ok(canAccessArea("admin", "data_import"));
    assert.ok(!canAccessArea("manager", "data_export"));
    assert.ok(!canAccessArea("bookkeeping_staff", "data_export"));
    assert.ok(!canAccessArea("general_staff", "data_import"));
  });

  await ok("import: headers in Spanish or English map to the same fields", () => {
    assert.equal(mapHeader("nombre_completo"), "fullName");
    assert.equal(mapHeader("Teléfono"), "phone");
    assert.equal(mapHeader("Full Name"), "fullName");
    assert.equal(mapHeader("servicios de interés"), "services");
    assert.equal(mapHeader("whatever"), null);
  });

  await ok("import: invalid phone / email and missing name are errors; services by label", () => {
    const bad = validateImportRow({ fullName: "", phone: "123", email: "no-at-sign" }, 0);
    assert.deepEqual(bad.errors.sort(), ["email_invalid", "name_missing", "phone_invalid"]);
    const good = validateImportRow(
      { fullName: "Test Uno", phone: "407 555 0101", email: "UNO@Example.com", language: "English", services: "Taxes / Contabilidad; notary; Unknown" },
      1,
    );
    assert.deepEqual(good.errors, []);
    assert.equal(good.data.phone, "(407) 555-0101");
    assert.equal(good.data.email, "uno@example.com");
    assert.equal(good.data.language, "en");
    assert.deepEqual(good.data.services, ["tax_prep", "notary"]);
    assert.deepEqual(good.warnings, [{ kind: "unknown_service", value: "Unknown" }]);
  });

  await ok("import: duplicates by phone digits / email, against clients and inside the file", () => {
    const rows = [
      validateImportRow({ fullName: "A", phone: "407-555-0101" }, 0),
      validateImportRow({ fullName: "B", email: "b@example.com" }, 1),
      validateImportRow({ fullName: "C", phone: "(407) 555-0199" }, 2),
      validateImportRow({ fullName: "C again", phone: "4075550199" }, 3),
    ];
    const dups = findDuplicates(rows, [
      { id: "x", fullName: "Existing A", phone: "(407) 555-0101", email: null },
      { id: "y", fullName: "Existing B", phone: null, email: "B@example.com" },
    ]);
    assert.deepEqual(dups.get(0), { kind: "existing", clientId: "x", clientName: "Existing A", by: "phone" });
    assert.deepEqual(dups.get(1), { kind: "existing", clientId: "y", clientName: "Existing B", by: "email" });
    assert.equal(dups.get(2), undefined);
    assert.deepEqual(dups.get(3), { kind: "in_file", firstRow: 2 });
  });

  const tr = exportTranslator("es");
  const doc: ExportDoc = {
    title: tr.t("Export.lists.clients"),
    exportedLabel: "Exportado 10/06/2026",
    sections: [
      {
        heading: "Clientes",
        table: { columns: ["Nombre", "Teléfono", "Notas"], rows: [["José Núñez", "(407) 555-0101", "=HYPERLINK(\"x\")"]] },
      },
    ],
    footerNote: "Anthony Multiservice no es una firma de abogados.",
    landscape: true,
    fileBase: "clientes",
  };

  await ok("CSV: UTF-8 BOM, accents intact, formulas neutralized", () => {
    const buf = renderCsv(doc);
    assert.deepEqual([...buf.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
    const csv = buf.toString("utf8");
    assert.ok(csv.includes("José Núñez"));
    assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
  });
  await ok("PDF renders (landscape)", async () => {
    const buf = await renderPdf(doc);
    assert.equal(buf.subarray(0, 4).toString(), "%PDF");
  });
  await ok("Word (.docx) renders", async () => {
    const buf = await renderDocx(doc);
    assert.equal(buf.subarray(0, 2).toString(), "PK");
  });

  console.log(`\nexport.test.ts: all ${passed} checks passed.`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);

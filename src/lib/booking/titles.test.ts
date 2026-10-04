// Tests for the online-booking title format (src/lib/booking/titles.ts).
// Same dependency-free style as the other tests: Node's `assert`, run via `tsx`.
//
// Run with:
//   npx tsx src/lib/booking/titles.test.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SERVICE_LABELS_EN,
  bookingLanguageNote,
  buildBookingTitle,
  localizeBookingTitle,
  parseBookingTitle,
  type BookingTitleTranslators,
} from "./titles";

const messages = (locale: string) =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"));
const en = messages("en");
const es = messages("es");

// The stored English labels must match the English UI exactly.
assert.deepEqual(SERVICE_LABELS_EN, en.ServiceType);

function translators(m: typeof es): BookingTitleTranslators {
  return {
    service: (k) => m.ServiceType[k],
    source: (k, v) => {
      let s: string = m.AppointmentSource[k];
      for (const [name, value] of Object.entries(v ?? {})) s = s.replace(`{${name}}`, value);
      return s;
    },
  };
}

const title = buildBookingTitle("document_prep", "Ana Pérez: hija");
assert.equal(title, "Online booking — Document Preparation: Ana Pérez: hija");
assert.deepEqual(parseBookingTitle(title), {
  confirm: false,
  serviceType: "document_prep",
  name: "Ana Pérez: hija",
  requestedLanguage: null,
});

// Appointment title, Spanish CRM.
assert.equal(
  localizeBookingTitle(title, translators(es)),
  `Reserva en línea — ${es.ServiceType.document_prep}: Ana Pérez: hija`,
);
// English CRM shows the stored title unchanged.
assert.equal(localizeBookingTitle(title, translators(en)), title);

// Confirmation task with the language note.
const task = `Confirm: ${buildBookingTitle("notary", "John Doe")}${bookingLanguageNote("es")}`;
assert.equal(
  localizeBookingTitle(task, translators(es)),
  `Confirmar: Reserva en línea — ${es.ServiceType.notary}: John Doe — El cliente pidió atención en Español en esta reserva.`,
);
assert.equal(localizeBookingTitle(task, translators(en)), task);

// Every service round-trips.
for (const key of Object.keys(SERVICE_LABELS_EN) as (keyof typeof SERVICE_LABELS_EN)[]) {
  assert.equal(parseBookingTitle(buildBookingTitle(key, "X"))?.serviceType, key);
}

// Staff-written titles are never touched.
for (const t of ["Consulta fiscal", "Confirm: Notary visit", "Online booking — Unknown: X", "Online booking — Notary"]) {
  assert.equal(localizeBookingTitle(t, translators(es)), t);
}

console.log("titles.test.ts: all title assertions passed.");

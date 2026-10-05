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
  buildPortalChangeRequestTitle,
  buildPortalUploadTitle,
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
    system: (k) => m.SystemTitles[k],
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

// Client portal task titles (Step 2A).
assert.equal(buildPortalUploadTitle("W2.pdf", false), "Client upload: W2.pdf");
assert.equal(
  localizeBookingTitle(buildPortalUploadTitle("W2.pdf", true), translators(es)),
  `${es.SystemTitles.portalUploadSensitive}W2.pdf`,
);
// 2026-10-05 19:00Z = 3:00 PM EDT in Kissimmee.
const change = buildPortalChangeRequestTitle("reschedule", new Date("2026-10-05T19:00:00Z"), ' ¿Puede ser a las 4? ');
assert.equal(change, 'Client requested reschedule: 2026-10-05 3:00 PM — "¿Puede ser a las 4?"');
assert.equal(
  localizeBookingTitle(change, translators(es)),
  `${es.SystemTitles.portalRescheduleRequest}2026-10-05 3:00 PM — "¿Puede ser a las 4?"`,
);
assert.equal(
  buildPortalChangeRequestTitle("cancel", new Date("2026-12-01T15:30:00Z"), ""),
  "Client requested cancellation: 2026-12-01 10:30 AM",
);
assert.equal(localizeBookingTitle(change, translators(en)), change);

console.log("titles.test.ts: all title assertions passed.");

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
  buildPortalProfileChangeTitle,
  buildPortalServiceInterestTitle,
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

// Staff-written titles are never touched (the automatic "Confirm: " prefix
// is translated — see the task-title checks below).
for (const t of ["Consulta fiscal", "Online booking — Unknown: X", "Online booking — Notary"]) {
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

// Client portal task titles (Step 2B): field names, "(empty)", language /
// best-time values and service names are translated; client-typed values
// stay as they are.
const profile = buildPortalProfileChangeTitle(
  [
    { label: "Phone", before: "(555) 555-0101", after: "(555) 555-0199" },
    { label: "Address", before: "", after: "1 Main St; Apt 2" },
    { label: "Language", before: "English", after: "Spanish" },
    { label: "Best time to call", before: "", after: "Evening" },
  ],
  true,
);
assert.equal(
  localizeBookingTitle(profile, translators(es)),
  `${es.SystemTitles.portalInfoChangePhone}Teléfono: (555) 555-0101 → (555) 555-0199; Dirección: (vacío) → 1 Main St; Apt 2; Idioma: Inglés → Español; Mejor hora para llamar: (vacío) → Noche`,
);
assert.equal(localizeBookingTitle(profile, translators(en)), profile);
const emailOnly = buildPortalProfileChangeTitle([{ label: "Email", before: "a@example.com", after: "" }], false);
assert.equal(
  localizeBookingTitle(emailOnly, translators(es)),
  `${es.SystemTitles.portalInfoChange}Correo: a@example.com → (vacío)`,
);
const interest = buildPortalServiceInterestTitle(["company_registration", "irs_administrative"], "Necesito abrir una LLC");
assert.equal(
  localizeBookingTitle(interest, translators(es)),
  `${es.SystemTitles.portalServiceInterest}${es.ServiceType.company_registration}, ${es.ServiceType.irs_administrative} — "Necesito abrir una LLC"`,
);
assert.equal(localizeBookingTitle(interest, translators(en)), interest);
assert.equal(
  localizeBookingTitle(buildPortalServiceInterestTitle([], "Hola"), translators(es)),
  `${es.SystemTitles.portalServiceInterest}(ver comentario) — "Hola"`,
);

// Step 3B: "Call the client" tasks from automatic notices.
assert.equal(
  localizeBookingTitle("Call client (no authorized channel for an automatic notice): Appointment confirmed", translators(es)),
  `${es.SystemTitles.callClientNotice}${es.SystemTitles.notice_appointment_confirmed}`,
);

// Automatic task titles (cases, appointments, crons).
const booking = buildBookingTitle("tax_prep", "Ana Pérez");
for (const [stored, expected] of [
  ["Follow up: Renovar pasaporte", "Seguimiento: Renovar pasaporte"],
  [`24h reminder: ${booking}`, "Recordatorio 24 h: Reserva en línea — Impuestos y Contabilidad: Ana Pérez"],
  ["2h reminder: Cita", "Recordatorio 2 h: Cita"],
  ["Inactivity alert: LLC Ana", "Alerta de inactividad: LLC Ana"],
  ["No communication logged recently", "Sin comunicación reciente"],
  ["Confirm: Llamada con Ana", "Confirmar: Llamada con Ana"],
  ["Follow up: Inactivity alert: X", "Seguimiento: Alerta de inactividad: X"],
  ["Followup sin formato", "Followup sin formato"],
] as const) {
  const want = expected.replace("Impuestos y Contabilidad", es.ServiceType.tax_prep);
  assert.equal(localizeBookingTitle(stored, translators(es)), want);
  assert.equal(localizeBookingTitle(stored, translators(en)), stored);
}

// Titles stored before the 2026-10-06 service rename (old English names)
// still read as the service, in the new Spanish name.
for (const [old, key] of [
  ["Tax & Accounting", "tax_prep"],
  ["Company Registration", "company_registration"],
  ["Notary / RON / IPEN / Loan Signing", "notary"],
  ["IRS / EIN / ITIN Administrative", "irs_administrative"],
] as const) {
  assert.equal(parseBookingTitle(`Online booking — ${old}: Ana Pérez`)?.serviceType, key);
  assert.equal(
    localizeBookingTitle(`Confirm: Online booking — ${old}: Ana Pérez`, translators(es)),
    `${es.AppointmentSource.confirmPrefix}${es.AppointmentSource.online_booking} — ${es.ServiceType[key]}: Ana Pérez`,
  );
}

// Partner portal / Diamante Conecta 360 tasks: stored in English, shown in
// Spanish on /es (and unchanged on /en).
// [stored, Spanish, English when it differs from what is stored]
const partnerCases: [string, string, string?][] = [
  [
    "Review ally application (Diamante Conecta 360): PRUEBA CONECTA UNO — possible duplicate of Tile Pros",
    "Revisar solicitud de aliado (Diamante Conecta 360): PRUEBA CONECTA UNO — posible duplicado de Tile Pros",
  ],
  [
    "Assign referral to an ally: Maria needs \"Kitchen tile\" (from Chef Angel)",
    "Asignar referido a un aliado: Maria necesita \"Kitchen tile\" (de Chef Angel)",
  ],
  [
    "Direct referral (copy for AMS): Ally A → Ally C: Ana needs \"Tile\"",
    "Referido directo (copia para AMS): Ally A → Ally C: Ana necesita \"Tile\"",
  ],
  [
    "Meeting request from J & J: New services — preferred: Tuesday (video call) — note: after 3",
    "Solicitud de reunión de J & J: New services — prefiere: Tuesday (videollamada) — nota: after 3",
  ],
  ["Review partner services: added Tile install (from $1200.00)", "Revisar servicios del aliado: agregó Tile install (desde $1200.00)"],
  [
    "Review partner profile change: description: (empty) → Pisos; city: Orlando → Kissimmee",
    "Revisar cambio de perfil del aliado: Descripción: (vacío) → Pisos; Ciudad: Orlando → Kissimmee",
    "Review partner profile change: Description: (empty) → Pisos; City: Orlando → Kissimmee",
  ],
  ["Review partner document (w9): w9.pdf", "Revisar documento del aliado (W-9): w9.pdf", "Review partner document (W-9): w9.pdf"],
  [
    "Review ally-network document: \"contract.pdf\" — J Tile LLC — may contain sensitive data",
    "Revisar documento de la red del aliado: \"contract.pdf\" — J Tile LLC — puede contener datos sensibles",
  ],
  ["New ally added by Chef Angel: J Tile LLC", "Aliado nuevo agregado por Chef Angel: J Tile LLC"],
  [
    "Contractor license/insurance expiring: J & J — license 2026-10-20, insurance 2026-10-25",
    "Licencia/seguro del contratista por vencer: J & J — licencia 2026-10-20, seguro 2026-10-25",
  ],
];
for (const [stored, spanish, english] of partnerCases) {
  assert.equal(localizeBookingTitle(stored, translators(es)), spanish);
  assert.equal(localizeBookingTitle(stored, translators(en)), english ?? stored);
}

console.log("titles.test.ts: all title assertions passed.");

import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import {
  clients,
  cases,
  appointments,
  invoices,
  invoiceLineItems,
  notaryLogEntries,
  apostilleDetails,
} from "../src/lib/db/schema";

config({ path: ".env.local" });

const SEED_TAG = "[SEED DATA]";

async function main() {
  const db = getDb();

  const seededClients = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.notes, SEED_TAG));

  if (seededClients.length === 0) {
    console.log("No seed data found (nothing tagged with " + SEED_TAG + ").");
    return;
  }

  const clientIds = seededClients.map((c) => c.id);

  const seededCases = await db
    .select({ id: cases.id })
    .from(cases)
    .where(inArray(cases.clientId, clientIds));
  const caseIds = seededCases.map((c) => c.id);

  const seededInvoices = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(inArray(invoices.clientId, clientIds));
  const invoiceIds = seededInvoices.map((i) => i.id);

  if (invoiceIds.length > 0) {
    await db
      .delete(invoiceLineItems)
      .where(inArray(invoiceLineItems.invoiceId, invoiceIds));
    await db.delete(invoices).where(inArray(invoices.id, invoiceIds));
  }

  await db
    .delete(appointments)
    .where(inArray(appointments.clientId, clientIds));

  await db
    .delete(notaryLogEntries)
    .where(inArray(notaryLogEntries.clientId, clientIds));

  if (caseIds.length > 0) {
    await db
      .delete(apostilleDetails)
      .where(inArray(apostilleDetails.caseId, caseIds));
  }

  // documents table isn't seeded yet (Phase 8), but clean up defensively
  // in case seed data is expanded later without updating this script.

  await db.delete(cases).where(inArray(cases.clientId, clientIds));
  await db.delete(clients).where(inArray(clients.id, clientIds));

  console.log(
    `Removed ${clientIds.length} seed clients and all dependent rows.`,
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);

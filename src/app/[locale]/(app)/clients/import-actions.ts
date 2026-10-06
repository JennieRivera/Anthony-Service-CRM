"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { requireAccessArea } from "@/lib/permissions";
import {
  MAX_IMPORT_ROWS,
  findDuplicates,
  validateImportRow,
  type Duplicate,
  type ImportField,
  type ImportRowInput,
  type RowError,
  type RowWarning,
} from "@/lib/import/clients";

// Clients CSV import. The browser parses the file and sends the rows;
// both actions re-validate everything here. Nothing is written until
// importClientsAction, and only rows that pass validation are written.

const FIELDS: ImportField[] = ["fullName", "phone", "email", "language", "address", "services", "referralSource", "notes"];
const rowsSchema = z
  .array(z.record(z.string(), z.string().max(6000)))
  .max(MAX_IMPORT_ROWS);

function toInputs(raw: unknown): ImportRowInput[] {
  return rowsSchema.parse(raw).map((row) =>
    Object.fromEntries(FIELDS.filter((f) => typeof row[f] === "string").map((f) => [f, row[f]])),
  );
}

async function analyze(inputs: ImportRowInput[]) {
  const rows = inputs.map((input, i) => validateImportRow(input, i));
  const existing = await getDb()
    .select({ id: clients.id, fullName: clients.fullName, phone: clients.phone, email: clients.email })
    .from(clients);
  return { rows, duplicates: findDuplicates(rows, existing) };
}

export type ImportPreviewRow = {
  index: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  errors: RowError[];
  warnings: RowWarning[];
  duplicate: Duplicate | null;
};

export async function previewClientImportAction(raw: unknown): Promise<ImportPreviewRow[]> {
  await requireAccessArea("data_import");
  const { rows, duplicates } = await analyze(toInputs(raw));
  return rows.map((r) => ({
    index: r.index,
    fullName: r.data.fullName,
    phone: r.data.phone,
    email: r.data.email,
    errors: r.errors,
    warnings: r.warnings,
    duplicate: duplicates.get(r.index) ?? null,
  }));
}

export type ImportSummary = {
  created: number;
  updated: number;
  skipped: { index: number; fullName: string; reason: "error" | "duplicate" | "duplicate_in_file" }[];
};

// updateIndexes: rows that match an existing client and should update it
// (every other duplicate is skipped). An update only fills in what the
// CSV has — it never blanks a field — merges services, and appends notes.
export async function importClientsAction(raw: unknown, updateIndexes: number[]): Promise<ImportSummary> {
  await requireAccessArea("data_import");
  const toUpdate = new Set(z.array(z.number().int().min(0)).max(MAX_IMPORT_ROWS).parse(updateIndexes));
  const { rows, duplicates } = await analyze(toInputs(raw));
  const db = getDb();
  const summary: ImportSummary = { created: 0, updated: 0, skipped: [] };

  for (const row of rows) {
    const d = row.data;
    if (row.errors.length > 0) {
      summary.skipped.push({ index: row.index, fullName: d.fullName, reason: "error" });
      continue;
    }
    const dup = duplicates.get(row.index);
    if (dup?.kind === "in_file") {
      summary.skipped.push({ index: row.index, fullName: d.fullName, reason: "duplicate_in_file" });
      continue;
    }
    if (dup?.kind === "existing") {
      if (!toUpdate.has(row.index)) {
        summary.skipped.push({ index: row.index, fullName: d.fullName, reason: "duplicate" });
        continue;
      }
      const [current] = await db.select().from(clients).where(eq(clients.id, dup.clientId)).limit(1);
      if (!current) {
        summary.skipped.push({ index: row.index, fullName: d.fullName, reason: "duplicate" });
        continue;
      }
      const services = [...new Set([...(current.interestedServices ?? []), ...d.services])];
      await db
        .update(clients)
        .set({
          fullName: d.fullName || current.fullName,
          phone: d.phone ?? current.phone,
          email: d.email ?? current.email,
          address: d.address ?? current.address,
          referralSource: d.referralSource ?? current.referralSource,
          interestedServices: services.length ? services : null,
          notes:
            d.notes && !(current.notes ?? "").includes(d.notes)
              ? [current.notes, d.notes].filter(Boolean).join("\n")
              : current.notes,
        })
        .where(eq(clients.id, dup.clientId));
      summary.updated += 1;
      continue;
    }
    await db.insert(clients).values({
      fullName: d.fullName,
      phone: d.phone,
      email: d.email,
      preferredLanguage: d.language,
      status: "lead",
      address: d.address,
      interestedServices: d.services.length ? d.services : null,
      referralSource: d.referralSource,
      notes: d.notes,
    });
    summary.created += 1;
  }

  await logAuditEvent({
    action: "data.imported",
    entityType: "clients",
    entityId: null,
    summary: `Imported clients CSV: ${rows.length} rows — ${summary.created} created, ${summary.updated} updated, ${summary.skipped.length} skipped`,
  });
  revalidatePath("/clients");
  return summary;
}

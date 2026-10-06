import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getLegalTexts, pickLocale } from "@/lib/legal/texts";
import type { PortalDb } from "@/lib/portal/db";
import { EXPORT_RECORDS, buildRecordExport } from "@/lib/export/records";
import { exportGuard, exportResponse, exportedLabel } from "@/lib/export/respond";
import { exportTranslator } from "@/lib/export/translator";

// GET ?format=pdf|docx&locale=es — one record (client, case, appointment,
// company) as a full PDF or Word file. See src/lib/export/records.ts.
const paramsSchema = z.object({
  type: z.enum(EXPORT_RECORDS),
  id: z.string().uuid(),
  format: z.enum(["pdf", "docx"]),
  locale: z.enum(["en", "es"]),
});

export async function GET(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const denied = await exportGuard("data_export");
  if (denied) return denied;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const search = new URL(request.url).searchParams;
  const parsed = paramsSchema.safeParse({
    ...(await params),
    format: search.get("format"),
    locale: search.get("locale") ?? "es",
  });
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { type, id, format, locale } = parsed.data;

  const tr = exportTranslator(locale);
  const record = await buildRecordExport(type, id, tr);
  if (!record) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const legal = await getLegalTexts(getDb() as unknown as PortalDb);

  await logAuditEvent({
    action: "data.exported",
    entityType: type,
    entityId: id,
    summary: `Exported ${type} record as ${format.toUpperCase()}`,
  });

  return exportResponse(
    {
      title: record.title,
      subtitle: record.subtitle,
      exportedLabel: exportedLabel(tr),
      sections: record.sections,
      footerNote: pickLocale(legal.not_a_law_firm, locale),
      landscape: false,
      fileBase: `${tr.t(`Export.files.${type}`)}-${record.title}`,
    },
    format,
  );
}

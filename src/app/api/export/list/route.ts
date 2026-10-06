import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { isDatabaseConfigured } from "@/lib/db/config";
import { EXPORT_FORMATS } from "@/lib/export/document";
import { EXPORT_LISTS, MAX_EXPORT_ROWS, buildListTable, listIsLandscape } from "@/lib/export/lists";
import { exportGuard, exportResponse, exportedLabel } from "@/lib/export/respond";
import { exportTranslator } from "@/lib/export/translator";
import { getDb } from "@/lib/db";
import { getLegalTexts, pickLocale } from "@/lib/legal/texts";
import type { PortalDb } from "@/lib/portal/db";

// POST { list, format, ids, locale } — the ids are the rows the person is
// looking at, in display order. See src/lib/export/lists.ts.
const bodySchema = z.object({
  list: z.enum(EXPORT_LISTS),
  format: z.enum(EXPORT_FORMATS),
  ids: z.array(z.string().uuid()).max(MAX_EXPORT_ROWS),
  locale: z.enum(["en", "es"]),
});

export async function POST(request: Request) {
  const denied = await exportGuard("data_export");
  if (denied) return denied;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { list, format, ids, locale } = parsed.data;

  const tr = exportTranslator(locale);
  const table = await buildListTable(list, ids, tr);
  const title = tr.t(`Export.lists.${list}`);
  const legal = await getLegalTexts(getDb() as unknown as PortalDb);

  await logAuditEvent({
    action: "data.exported",
    entityType: list,
    entityId: null,
    summary: `Exported ${table.rows.length} ${list} as ${format.toUpperCase()}`,
  });

  return exportResponse(
    {
      title,
      subtitle: tr.t("Export.recordCount", { count: table.rows.length }),
      exportedLabel: exportedLabel(tr),
      sections: [{ heading: title, table, empty: tr.t("Export.none") }],
      footerNote: pickLocale(legal.not_a_law_firm, locale),
      landscape: listIsLandscape(table),
      fileBase: tr.t(`Export.files.${list}`),
    },
    format,
  );
}

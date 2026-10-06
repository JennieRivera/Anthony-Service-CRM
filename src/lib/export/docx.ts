import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { BRAND, type ExportDoc, type ExportTable } from "./document";

const hex = (color: string) => color.replace("#", "");
const FONT = "Calibri";

function run(textValue: string, opts: { bold?: boolean; color?: string; size?: number } = {}) {
  return new TextRun({ text: textValue, font: FONT, bold: opts.bold, color: opts.color, size: opts.size });
}

function table(t: ExportTable): Table {
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: hex(BRAND.border) };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
    rows: [
      new TableRow({
        tableHeader: true,
        children: t.columns.map(
          (c) =>
            new TableCell({
              borders,
              shading: { type: ShadingType.CLEAR, color: "auto", fill: hex(BRAND.navy) },
              children: [new Paragraph({ children: [run(c, { bold: true, color: "FFFFFF", size: 18 })] })],
            }),
        ),
      }),
      ...t.rows.map(
        (row, r) =>
          new TableRow({
            cantSplit: true,
            children: row.map(
              (value) =>
                new TableCell({
                  borders,
                  shading: r % 2 ? { type: ShadingType.CLEAR, color: "auto", fill: hex(BRAND.cream) } : undefined,
                  children: [new Paragraph({ children: [run(value, { size: 18 })] })],
                }),
            ),
          }),
      ),
    ],
  });
}

export async function renderDocx(doc: ExportDoc): Promise<Buffer> {
  const body: (Paragraph | Table)[] = [
    new Paragraph({ children: [run(BRAND.name, { bold: true, color: hex(BRAND.blue), size: 22 })] }),
    new Paragraph({ children: [run(doc.title, { bold: true, color: hex(BRAND.navy), size: 32 })] }),
    ...(doc.subtitle ? [new Paragraph({ children: [run(doc.subtitle, { size: 20 })] })] : []),
    new Paragraph({
      spacing: { after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: hex(BRAND.gold), space: 4 } },
      children: [run(doc.exportedLabel, { color: "5B6573", size: 16 })],
    }),
  ];

  for (const section of doc.sections) {
    body.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [run(section.heading, { bold: true, color: hex(BRAND.blue), size: 24 })],
      }),
    );
    for (const [label, value] of section.fields ?? []) {
      body.push(new Paragraph({ children: [run(`${label}: `, { color: "5B6573", size: 20 }), run(value || "—", { size: 20 })] }));
    }
    if (section.table) {
      body.push(
        section.table.rows.length === 0
          ? new Paragraph({ children: [run(section.empty ?? "—", { color: "5B6573", size: 20 })] })
          : table(section.table),
      );
    }
  }

  const footer = new Footer({
    children: [
      ...(doc.footerNote ? [new Paragraph({ children: [run(doc.footerNote, { color: "5B6573", size: 14 })] })] : []),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ font: FONT, size: 14, color: "5B6573", children: [`${BRAND.name} · ${doc.exportedLabel} · `, PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES] }),
        ],
      }),
    ],
  });

  const document = new Document({
    creator: BRAND.name,
    title: doc.title,
    sections: [
      {
        properties: {
          page: {
            size: { orientation: doc.landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        footers: { default: footer },
        children: body,
      },
    ],
  });
  return Packer.toBuffer(document);
}

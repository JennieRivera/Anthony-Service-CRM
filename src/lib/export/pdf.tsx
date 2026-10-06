import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { BRAND, type ExportDoc, type ExportTable } from "./document";

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 36, fontSize: 9, fontFamily: "Helvetica", color: BRAND.navy },
  header: { borderBottomWidth: 2, borderBottomColor: BRAND.gold, paddingBottom: 8, marginBottom: 14 },
  brand: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND.blue },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 4 },
  subtitle: { fontSize: 10, marginTop: 2 },
  exported: { fontSize: 8, color: "#5B6573", marginTop: 4 },
  section: { marginBottom: 14 },
  heading: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND.blue, marginBottom: 6 },
  fieldRow: { flexDirection: "row", paddingVertical: 2 },
  fieldLabel: { width: 140, color: "#5B6573" },
  fieldValue: { flex: 1 },
  tableHeader: { flexDirection: "row", backgroundColor: BRAND.navy, color: "#FFFFFF" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: BRAND.border },
  rowAlt: { backgroundColor: BRAND.cream },
  cell: { flex: 1, paddingVertical: 3, paddingHorizontal: 4 },
  headerCell: { flex: 1, paddingVertical: 4, paddingHorizontal: 4, fontFamily: "Helvetica-Bold" },
  empty: { color: "#5B6573" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    borderTopWidth: 0.5,
    borderTopColor: BRAND.border,
    paddingTop: 4,
    fontSize: 7,
    color: "#5B6573",
  },
  footerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
});

function Table({ table }: { table: ExportTable }) {
  return (
    <View>
      <View style={styles.tableHeader} fixed>
        {table.columns.map((c, i) => (
          <Text key={i} style={styles.headerCell}>
            {c}
          </Text>
        ))}
      </View>
      {table.rows.map((row, r) => (
        <View key={r} style={r % 2 ? [styles.row, styles.rowAlt] : styles.row} wrap={false}>
          {row.map((value, i) => (
            <Text key={i} style={styles.cell}>
              {value}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function ExportPdf({ doc }: { doc: ExportDoc }) {
  return (
    <Document title={doc.title} author={BRAND.name}>
      <Page
        size="LETTER"
        orientation={doc.landscape ? "landscape" : "portrait"}
        // Room for the (longer) footer when it carries the legal notice.
        style={doc.footerNote ? [styles.page, { paddingBottom: 84 }] : styles.page}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>{BRAND.name}</Text>
          <Text style={styles.title}>{doc.title}</Text>
          {doc.subtitle && <Text style={styles.subtitle}>{doc.subtitle}</Text>}
          <Text style={styles.exported}>{doc.exportedLabel}</Text>
        </View>

        {doc.sections.map((section, s) => (
          <View key={s} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            {section.fields?.map(([label, value], i) => (
              <View key={i} style={styles.fieldRow} wrap={false}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <Text style={styles.fieldValue}>{value || "—"}</Text>
              </View>
            ))}
            {section.table &&
              (section.table.rows.length === 0 ? (
                <Text style={styles.empty}>{section.empty ?? "—"}</Text>
              ) : (
                <Table table={section.table} />
              ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          {doc.footerNote && <Text>{doc.footerNote}</Text>}
          <View style={styles.footerRow}>
            <Text>
              {BRAND.name} · {doc.exportedLabel}
            </Text>
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderPdf(doc: ExportDoc): Promise<Buffer> {
  return renderToBuffer(<ExportPdf doc={doc} />);
}

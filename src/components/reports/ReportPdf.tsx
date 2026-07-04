import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#0F1A2B" },
  title: { fontSize: 16, marginBottom: 4 },
  muted: { color: "#5B6472", marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, marginBottom: 8, fontWeight: 700 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E4E0D6",
    paddingVertical: 4,
  },
  kpiRow: { flexDirection: "row", gap: 24, marginBottom: 20 },
  kpiLabel: { color: "#5B6472" },
  kpiValue: { fontSize: 14, fontWeight: 700 },
});

export function ReportPdf({
  from,
  to,
  totalRevenue,
  newClients,
  newCases,
  avgTurnaroundDays,
  revenueByService,
}: {
  from: string;
  to: string;
  totalRevenue: number;
  newClients: number;
  newCases: number;
  avgTurnaroundDays: number | null;
  revenueByService: { serviceType: string; revenue: number }[];
}) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Anthony Service, LLC — Report</Text>
        <Text style={styles.muted}>
          {from} to {to}
        </Text>

        <View style={styles.kpiRow}>
          <View>
            <Text style={styles.kpiLabel}>Total Revenue</Text>
            <Text style={styles.kpiValue}>${totalRevenue.toFixed(2)}</Text>
          </View>
          <View>
            <Text style={styles.kpiLabel}>New Clients</Text>
            <Text style={styles.kpiValue}>{newClients}</Text>
          </View>
          <View>
            <Text style={styles.kpiLabel}>New Cases</Text>
            <Text style={styles.kpiValue}>{newCases}</Text>
          </View>
          <View>
            <Text style={styles.kpiLabel}>Avg. Turnaround</Text>
            <Text style={styles.kpiValue}>
              {avgTurnaroundDays !== null
                ? `${avgTurnaroundDays.toFixed(1)} days`
                : "N/A"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue by Service Type</Text>
          {revenueByService.map((row) => (
            <View key={row.serviceType} style={styles.row}>
              <Text>{row.serviceType}</Text>
              <Text>${row.revenue.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

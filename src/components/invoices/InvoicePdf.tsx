import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Client, Invoice, InvoiceLineItem } from "@/lib/db/schema";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0F1A2B",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  businessName: {
    fontSize: 18,
    marginBottom: 4,
  },
  muted: {
    color: "#5B6472",
  },
  invoiceTitle: {
    fontSize: 16,
    textAlign: "right",
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  table: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E4E0D6",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E4E0D6",
    paddingVertical: 6,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E4E0D6",
    paddingVertical: 6,
  },
  colDescription: { width: "50%" },
  colQty: { width: "15%", textAlign: "right" },
  colPrice: { width: "17.5%", textAlign: "right" },
  colTotal: { width: "17.5%", textAlign: "right" },
  totalsSection: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 2,
  },
  grandTotal: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 4,
  },
});

export function InvoicePdf({
  invoice,
  client,
  lineItems,
  caseTitle,
}: {
  invoice: Invoice;
  client: Client;
  lineItems: InvoiceLineItem[];
  caseTitle?: string | null;
}) {
  const invoiceNumber = `INV-${String(invoice.invoiceSeq).padStart(5, "0")}`;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>Anthony Service, LLC</Text>
            <Text style={styles.muted}>2610 Orchid Ln, Kissimmee, FL</Text>
            <Text style={styles.muted}>(407) 802-7252</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>{invoiceNumber}</Text>
            <Text style={styles.muted}>
              Issued: {new Date(invoice.issueDate).toLocaleDateString()}
            </Text>
            {invoice.dueDate && (
              <Text style={styles.muted}>
                Due: {new Date(invoice.dueDate).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text>Bill To:</Text>
          <Text>{client.fullName}</Text>
          {client.email && <Text style={styles.muted}>{client.email}</Text>}
          {client.phone && <Text style={styles.muted}>{client.phone}</Text>}
          {caseTitle && <Text style={styles.muted}>Case: {caseTitle}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{Number(item.quantity)}</Text>
              <Text style={styles.colPrice}>
                ${Number(item.unitPrice).toFixed(2)}
              </Text>
              <Text style={styles.colTotal}>
                ${Number(item.lineTotal).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>${Number(invoice.subtotal).toFixed(2)}</Text>
          </View>
          {invoice.taxAmount && (
            <View style={styles.totalRow}>
              <Text>Tax</Text>
              <Text>${Number(invoice.taxAmount).toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Total</Text>
            <Text>${Number(invoice.total).toFixed(2)}</Text>
          </View>
          {invoice.status === "paid" && invoice.paymentMethod && (
            <Text style={styles.muted}>Paid via {invoice.paymentMethod}</Text>
          )}
        </View>

        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.muted}>{invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

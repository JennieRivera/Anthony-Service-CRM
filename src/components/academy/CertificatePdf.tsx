import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { AcademyCertificate } from "@/lib/db/schema";
import { formatCertificateNumber } from "@/lib/queries/academyCertificates";
import { formatDate } from "@/lib/dates";

// Same AMS brand tokens used on the on-screen certificate view
// (src/app/[locale]/(app)/academy/certificates/[id]/page.tsx) — react-pdf
// cannot read CSS variables, so these are the literal hex values from
// globals.css: Pearl Cream background, Professional Blue accent text,
// Champagne Gold border/rule, navy body text.
const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    color: "#1C2B3E",
    backgroundColor: "#FFFFFF",
  },
  frame: {
    flex: 1,
    borderWidth: 4,
    borderColor: "#C8A96B",
    padding: 36,
    alignItems: "center",
  },
  issuer: {
    fontSize: 18,
    marginTop: 12,
  },
  heading: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#5B6672",
    marginTop: 4,
    textTransform: "uppercase",
  },
  muted: {
    fontSize: 11,
    color: "#5B6672",
    marginTop: 20,
  },
  studentName: {
    fontSize: 24,
    color: "#477297",
    marginTop: 8,
  },
  courseName: {
    fontSize: 16,
    marginTop: 8,
  },
  datesRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 48,
    marginTop: 28,
  },
  dateLabel: {
    fontSize: 9,
    color: "#5B6672",
    textTransform: "uppercase",
  },
  dateValue: {
    fontSize: 11,
    marginTop: 2,
  },
  signatureBlock: {
    alignItems: "center",
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: "#C8A96B",
    paddingTop: 10,
    width: 260,
  },
  certNumber: {
    fontSize: 9,
    color: "#5B6672",
    marginTop: 24,
  },
  revokedBanner: {
    fontSize: 14,
    color: "#A13B2C",
    marginBottom: 16,
    textAlign: "center",
  },
});

export function CertificatePdf({ certificate }: { certificate: AcademyCertificate }) {
  const certificateNumber = formatCertificateNumber(certificate.certificateSeq, certificate.issueDate);
  const revoked = certificate.status === "revoked";

  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.frame}>
          {revoked && <Text style={styles.revokedBanner}>REVOKED</Text>}
          <Text style={styles.issuer}>Anthony Multiservice Academy</Text>
          <Text style={styles.heading}>Certificate of Completion</Text>
          <Text style={styles.muted}>This certifies that</Text>
          <Text style={styles.studentName}>{certificate.studentNameSnapshot}</Text>
          <Text style={styles.muted}>has successfully completed</Text>
          <Text style={styles.courseName}>
            {certificate.courseNameSnapshot}
            {certificate.programNameSnapshot ? ` — ${certificate.programNameSnapshot}` : ""}
          </Text>

          <View style={styles.datesRow}>
            <View>
              <Text style={styles.dateLabel}>Issue Date</Text>
              <Text style={styles.dateValue}>{formatDate(certificate.issueDate)}</Text>
            </View>
            <View>
              <Text style={styles.dateLabel}>Completion Date</Text>
              <Text style={styles.dateValue}>
                {certificate.completionDate ? formatDate(certificate.completionDate) : "—"}
              </Text>
            </View>
          </View>

          <View style={styles.signatureBlock}>
            <Text>{certificate.issuedBy}</Text>
            <Text style={styles.dateLabel}>Authorized Signature</Text>
          </View>

          <Text style={styles.certNumber}>Certificate No. {certificateNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}

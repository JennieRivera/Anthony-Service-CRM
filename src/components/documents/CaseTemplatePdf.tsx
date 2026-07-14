import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Case, Client, NotaryLogEntry } from "@/lib/db/schema";
import { getServiceTemplate } from "@/lib/templates/serviceTemplates";

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
    marginBottom: 20,
  },
  businessName: {
    fontSize: 16,
    marginBottom: 4,
  },
  muted: {
    color: "#5B6472",
  },
  docTitleEn: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 2,
  },
  docTitleEs: {
    fontSize: 11,
    textAlign: "center",
    color: "#5B6472",
    marginBottom: 16,
  },
  intro: {
    marginBottom: 16,
    lineHeight: 1.4,
  },
  introEs: {
    marginBottom: 16,
    lineHeight: 1.4,
    color: "#5B6472",
    fontStyle: "italic",
  },
  caseBox: {
    marginBottom: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E4E0D6",
    borderRadius: 4,
  },
  caseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeadingEn: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 2,
  },
  sectionHeadingEs: {
    fontSize: 9,
    color: "#5B6472",
    marginBottom: 8,
  },
  bodyText: {
    marginBottom: 6,
    lineHeight: 1.4,
  },
  bodyTextEs: {
    marginBottom: 6,
    lineHeight: 1.4,
    color: "#5B6472",
    fontStyle: "italic",
  },
  field: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  fieldLabel: {
    width: "45%",
  },
  fieldLabelEs: {
    color: "#5B6472",
    fontSize: 8,
  },
  fieldLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#0F1A2B",
    marginLeft: 8,
  },
  notaryBlock: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E4E0D6",
  },
  notaryTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
  },
  notaryLine: {
    marginBottom: 10,
    lineHeight: 1.6,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  signatureBlock: {
    width: "45%",
    borderTopWidth: 1,
    borderTopColor: "#0F1A2B",
    paddingTop: 4,
  },
});

const ACT_TYPE_CERTIFICATE: Record<
  string,
  { en: string; es: string }
> = {
  acknowledgment: {
    en: 'The foregoing instrument was acknowledged before me by means of ☐ physical presence or ☐ online notarization, this ____ day of ______________, 20____, by ___________________________, who is personally known to me or who has produced ___________________________ as identification.',
    es: "El instrumento anterior fue reconocido ante mí, mediante ☐ presencia física o ☐ notarización en línea, el día ____ de ______________ de 20____, por ___________________________, quien es personalmente conocido(a) por mí o quien ha presentado ___________________________ como identificación.",
  },
  jurat: {
    en: 'Sworn to (or affirmed) and subscribed before me by means of ☐ physical presence or ☐ online notarization, this ____ day of ______________, 20____, by ___________________________, who is personally known to me or who has produced ___________________________ as identification.',
    es: "Jurado (o afirmado) y suscrito ante mí, mediante ☐ presencia física o ☐ notarización en línea, el día ____ de ______________ de 20____, por ___________________________, quien es personalmente conocido(a) por mí o quien ha presentado ___________________________ como identificación.",
  },
  oath_affirmation: {
    en: 'Sworn to (or affirmed) before me by means of ☐ physical presence or ☐ online notarization, this ____ day of ______________, 20____, by ___________________________, who is personally known to me or who has produced ___________________________ as identification.',
    es: "Jurado (o afirmado) ante mí, mediante ☐ presencia física o ☐ notarización en línea, el día ____ de ______________ de 20____, por ___________________________, quien es personalmente conocido(a) por mí o quien ha presentado ___________________________ como identificación.",
  },
  signature_witnessing: {
    en: 'Signed before me by means of ☐ physical presence or ☐ online notarization, this ____ day of ______________, 20____, by ___________________________, who is personally known to me or who has produced ___________________________ as identification.',
    es: "Firmado ante mí, mediante ☐ presencia física o ☐ notarización en línea, el día ____ de ______________ de 20____, por ___________________________, quien es personalmente conocido(a) por mí o quien ha presentado ___________________________ como identificación.",
  },
  copy_certification: {
    en: "I certify that the attached reproduction is a true, exact, complete, and unaltered photocopy made by me of the document presented to me on this ____ day of ______________, 20____.",
    es: "Certifico que la reproducción adjunta es una fotocopia fiel, exacta, completa y sin alteraciones del documento que me fue presentado el día ____ de ______________ de 20____.",
  },
  other: {
    en: 'Performed before me by means of ☐ physical presence or ☐ online notarization, this ____ day of ______________, 20____, by ___________________________, who is personally known to me or who has produced ___________________________ as identification.',
    es: "Realizado ante mí, mediante ☐ presencia física o ☐ notarización en línea, el día ____ de ______________ de 20____, por ___________________________, quien es personalmente conocido(a) por mí o quien ha presentado ___________________________ como identificación.",
  },
};

export function CaseTemplatePdf({
  caseRecord,
  client,
  notaryEntry,
}: {
  caseRecord: Case;
  client: Client;
  notaryEntry?: NotaryLogEntry | null;
}) {
  const template = getServiceTemplate(caseRecord.serviceType);
  const certificate =
    ACT_TYPE_CERTIFICATE[notaryEntry?.notarialActType ?? "acknowledgment"];

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
            <Text style={styles.muted}>
              Generated: {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>

        <Text style={styles.docTitleEn}>{template.documentTitle.en}</Text>
        <Text style={styles.docTitleEs}>{template.documentTitle.es}</Text>

        <Text style={styles.intro}>{template.intro.en}</Text>
        <Text style={styles.introEs}>{template.intro.es}</Text>

        <View style={styles.caseBox}>
          <View style={styles.caseRow}>
            <Text>Client / Cliente:</Text>
            <Text>{client.fullName}</Text>
          </View>
          <View style={styles.caseRow}>
            <Text>Case / Caso:</Text>
            <Text>{caseRecord.title}</Text>
          </View>
          {client.phone && (
            <View style={styles.caseRow}>
              <Text>Phone / Teléfono:</Text>
              <Text>{client.phone}</Text>
            </View>
          )}
          {client.email && (
            <View style={styles.caseRow}>
              <Text>Email / Correo:</Text>
              <Text>{client.email}</Text>
            </View>
          )}
          {caseRecord.dueDate && (
            <View style={styles.caseRow}>
              <Text>Due Date / Vencimiento:</Text>
              <Text>
                {new Date(caseRecord.dueDate).toLocaleDateString()}
              </Text>
            </View>
          )}
          {caseRecord.fee && (
            <View style={styles.caseRow}>
              <Text>Fee / Tarifa:</Text>
              <Text>${Number(caseRecord.fee).toFixed(2)}</Text>
            </View>
          )}
        </View>

        {template.sections.map((section, i) => (
          <View key={i} style={styles.section} wrap={false}>
            <Text style={styles.sectionHeadingEn}>{section.heading.en}</Text>
            <Text style={styles.sectionHeadingEs}>{section.heading.es}</Text>

            {section.body?.map((paragraph, j) => (
              <View key={j}>
                <Text style={styles.bodyText}>{paragraph.en}</Text>
                <Text style={styles.bodyTextEs}>{paragraph.es}</Text>
              </View>
            ))}

            {section.fields?.map((field, j) => (
              <View key={j} style={styles.field}>
                <View style={styles.fieldLabel}>
                  <Text>{field.en}</Text>
                  <Text style={styles.fieldLabelEs}>{field.es}</Text>
                </View>
                <View style={styles.fieldLine} />
              </View>
            ))}
          </View>
        ))}

        {template.includeNotaryBlock && (
          <View style={styles.notaryBlock} wrap={false}>
            <Text style={styles.notaryTitle}>
              Notarial Certificate / Certificado Notarial
            </Text>
            <Text style={styles.bodyText}>State of Florida</Text>
            <Text style={styles.bodyTextEs}>Estado de la Florida</Text>
            <Text style={styles.bodyText}>
              County of _____________________
            </Text>
            <Text style={styles.bodyTextEs}>
              Condado de _____________________
            </Text>
            <Text style={styles.notaryLine}>{certificate.en}</Text>
            <Text style={[styles.bodyTextEs, { marginBottom: 16 }]}>
              {certificate.es}
            </Text>

            <View style={styles.signatureRow}>
              <View style={styles.signatureBlock}>
                <Text>Notary Public Signature</Text>
                <Text style={styles.muted}>Firma del Notario Público</Text>
              </View>
              <View style={styles.signatureBlock}>
                <Text>Print Name / Nombre en Letra de Molde</Text>
              </View>
            </View>
            <View style={styles.signatureRow}>
              <View style={styles.signatureBlock}>
                <Text>Commission Number</Text>
                <Text style={styles.muted}>Número de Comisión</Text>
              </View>
              <View style={styles.signatureBlock}>
                <Text>Commission Expires</Text>
                <Text style={styles.muted}>Vencimiento de la Comisión</Text>
              </View>
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}

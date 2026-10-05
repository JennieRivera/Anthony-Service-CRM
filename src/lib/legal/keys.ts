// Legal / disclosure text keys and defaults — pure constants, safe to
// import from client components (no database imports). The defaults are
// the owner's own wording (2026-10-04). NONE of this is legal advice and
// the final wording of every text must be reviewed by a licensed attorney.

export const LEGAL_TEXT_KEYS = [
  "not_a_law_firm",
  "not_a_law_firm_ack",
  "florida_notary_disclosure",
] as const;
export type LegalTextKey = (typeof LEGAL_TEXT_KEYS)[number];

export type LegalText = { en: string; es: string };

export const DEFAULT_LEGAL_TEXTS: Record<LegalTextKey, LegalText> = {
  not_a_law_firm: {
    en: "Anthony Multiservice is not a law firm. We are not attorneys and do not provide legal or immigration advice. We provide administrative and document-preparation services at the client's direction. If you need legal advice, please consult a licensed attorney or an accredited representative.",
    es: "Anthony Multiservice no es una firma de abogados. No somos abogados y no damos asesoría legal ni de inmigración. Ofrecemos servicios administrativos y de preparación de documentos según las instrucciones del cliente. Si necesita asesoría legal, consulte a un abogado licenciado o a un representante acreditado.",
  },
  not_a_law_firm_ack: {
    en: "I understand that Anthony Multiservice is not a law firm and does not give me legal advice.",
    es: "Entiendo que Anthony Multiservice no es una firma de abogados y no me da asesoría legal.",
  },
  // Florida Statutes §117.05(10): a non-attorney notary public who
  // advertises notary services in a language other than English must post
  // this notice in English AND in the language of the advertisement. The
  // English text is the statute's exact wording (supplied by the owner,
  // 2026-10-04); the Spanish translation is pending attorney review.
  // Always displayed in BOTH languages together — see bothLanguages().
  florida_notary_disclosure: {
    en: "I AM NOT AN ATTORNEY LICENSED TO PRACTICE LAW IN THE STATE OF FLORIDA, AND I MAY NOT GIVE LEGAL ADVICE OR ACCEPT FEES FOR LEGAL ADVICE.",
    es: "NO SOY ABOGADO CON LICENCIA PARA EJERCER LA ABOGACÍA EN EL ESTADO DE FLORIDA, Y NO PUEDO DAR ASESORÍA LEGAL NI ACEPTAR HONORARIOS POR ASESORÍA LEGAL.",
  },
};

export type LegalTexts = Record<LegalTextKey, LegalText>;

export function pickLocale(text: LegalText, locale: string): string {
  return locale === "es" ? text.es : text.en;
}

// For notices the law requires in English AND Spanish at the same time
// (the §117.05(10) disclosure): English first, then Spanish, skipping
// empty ones.
export function bothLanguages(text: LegalText): string[] {
  return [text.en, text.es].map((t) => t.trim()).filter(Boolean);
}

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
  // Deliberately empty: the exact wording Florida law requires of a
  // non-attorney notary (especially when advertising in Spanish) must come
  // from an attorney, not from code. Shown only once filled in.
  florida_notary_disclosure: { en: "", es: "" },
};

export type LegalTexts = Record<LegalTextKey, LegalText>;

export function pickLocale(text: LegalText, locale: string): string {
  return locale === "es" ? text.es : text.en;
}

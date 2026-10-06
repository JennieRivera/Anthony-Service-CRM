// Legal / disclosure text keys and defaults — pure constants, safe to
// import from client components (no database imports). The defaults are
// the owner's own wording (2026-10-04). NONE of this is legal advice and
// the final wording of every text must be reviewed by a licensed attorney.

export const LEGAL_TEXT_KEYS = [
  "not_a_law_firm",
  // Short one-line version for the bottom of automatic emails; the full
  // text above stays on /book, the portal and the Privacy Notice.
  "not_a_law_firm_email",
  "not_a_law_firm_ack",
  // Partner portal: what an alliance accepts the first time it signs in.
  "partner_terms",
  "florida_notary_disclosure",
  "document_processing_authorization",
  "privacy_notice",
  "sms_consent",
] as const;
export type LegalTextKey = (typeof LEGAL_TEXT_KEYS)[number];

// Long texts get a bigger editor and a higher length limit.
export const LONG_LEGAL_TEXT_KEYS: readonly LegalTextKey[] = ["privacy_notice", "partner_terms"];
export const legalTextMaxLength = (key: LegalTextKey) =>
  LONG_LEGAL_TEXT_KEYS.includes(key) ? 20000 : 4000;

export type LegalText = { en: string; es: string };

export const DEFAULT_LEGAL_TEXTS: Record<LegalTextKey, LegalText> = {
  not_a_law_firm: {
    en: "Anthony Multiservice is not a law firm. We are not attorneys and do not provide legal or immigration advice. We provide administrative and document-preparation services at the client's direction. If you need legal advice, please consult a licensed attorney or an accredited representative.",
    es: "Anthony Multiservice no es una firma de abogados. No somos abogados y no damos asesoría legal ni de inmigración. Ofrecemos servicios administrativos y de preparación de documentos según las instrucciones del cliente. Si necesita asesoría legal, consulte a un abogado licenciado o a un representante acreditado.",
  },
  not_a_law_firm_email: {
    en: "Anthony Multiservice is not a law firm and does not provide legal advice.",
    es: "Anthony Multiservice no es una firma de abogados y no ofrece asesoría legal.",
  },
  // DRAFT written 2026-10-06 at the owner's request — pending review by a
  // licensed attorney before relying on it (Settings → Legal texts says so).
  partner_terms: {
    en: "Alliance terms (draft — pending attorney review).\n1. Anthony Multiservice (AMS) and your business are independent. Neither is the other's employee, agent, or legal representative.\n2. Only share information about people who gave you permission. You are responsible for that permission.\n3. Client information AMS refers to you is confidential: use it only to serve that referral, and do not share it.\n4. You are responsible for your own licenses, insurance, taxes, and the work you perform. AMS does not perform or guarantee that work.\n5. Marketing materials shared through the portal may only be used to promote the alliance, as agreed.\n6. Referral fees or commissions, if any, are governed by your signed alliance agreement.\n7. AMS may suspend portal access at any time.",
    es: "Términos de la alianza (borrador — pendiente de revisión de un abogado).\n1. Anthony Multiservice (AMS) y su negocio son independientes. Ninguno es empleado, agente ni representante legal del otro.\n2. Solo comparta datos de personas que le dieron permiso. Usted es responsable de ese permiso.\n3. La información de clientes que AMS le refiera es confidencial: úsela solo para atender ese referido y no la comparta.\n4. Usted es responsable de sus propias licencias, seguros, impuestos y del trabajo que realiza. AMS no realiza ni garantiza ese trabajo.\n5. Los materiales de marketing compartidos en el portal solo se pueden usar para promocionar la alianza, según lo acordado.\n6. Las comisiones o pagos por referidos, si los hay, se rigen por su acuerdo de alianza firmado.\n7. AMS puede suspender el acceso al portal en cualquier momento.",
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
  // Client portal → My authorizations. The client also types their name
  // as a simple signature; both are stored with the consent event.
  document_processing_authorization: {
    en: "I authorize Anthony Multiservice to review and process the documents I provide, only for the services I request.",
    es: "Autorizo a Anthony Multiservice a revisar y procesar los documentos que yo entregue, solo para los servicios que yo solicite.",
  },
  // The optional SMS opt-in checkbox on /book (Step 3B), in the form US
  // carriers expect (Twilio Toll-Free Verification): who sends, what kind
  // of messages, frequency, "msg & data rates", STOP/HELP, privacy notice.
  sms_consent: {
    en: "I agree to receive text messages from Anthony Multiservice about my appointments and my case at the phone number I provided. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of any purchase. See our Privacy Notice.",
    es: "Acepto recibir mensajes de texto de Anthony Multiservice sobre mis citas y mi caso al número que indiqué. La frecuencia de los mensajes varía. Pueden aplicarse tarifas de mensajes y datos. Responda STOP para cancelar o HELP para recibir ayuda. Aceptar no es una condición para ninguna compra. Consulte nuestro Aviso de Privacidad.",
  },
  // DRAFT ONLY (Step 2B, 2026-10-05) — a starting point written in plain
  // language, NOT reviewed by an attorney. Shown at /privacy. Lines
  // starting with "## " render as headings; blank lines split paragraphs.
  privacy_notice: {
    en: `This privacy notice explains what information Anthony Multiservice, LLC ("we") collects from clients and visitors, how we use it, and the choices you have. This is a draft pending review by an attorney.

## Information we collect
- Contact details you give us: name, phone, email, mailing address, preferred language and best time to call.
- Information and documents you provide for the services you request (for example tax, company-registration or immigration forms), which may include identification numbers.
- Records of your appointments, requests and authorizations, including the date, time and IP address of each authorization.
- An optional profile photo, if you add one in the client portal.

## How we use your information
- To provide the services you request, at your direction.
- To contact you about your case and your appointments, using only the channels you have authorized (phone, WhatsApp, text messages, email).
- To send promotions only if you have accepted marketing messages. You can withdraw that at any time.
- To meet our legal and record-keeping obligations.

## How we protect your information
Your documents are stored in private storage and are only available to our staff and, through the client portal, to you. We do not sell your personal information.

## Sharing
We share information only when it is needed to provide the service you requested (for example, submitting a form to a government agency at your direction), when you authorize it, or when the law requires it.

## Text messages (SMS)
If you agree to receive text messages, we send only notices about your appointments and your case (for example, an appointment confirmation or reminder). Message frequency varies. Message and data rates may apply. Reply STOP to stop receiving them, or HELP for help. We do not share your mobile number or your text-message consent with third parties or affiliates for their marketing purposes.

## Your choices
In the client portal ("My authorizations") you can accept or withdraw your contact and marketing preferences at any time, and update your contact details ("My profile"). You can also call us to ask about the information we keep about you.

## Not a law firm
Anthony Multiservice is not a law firm and does not provide legal advice.

## Contact
Questions about this notice: call us at (689) 342-6309.`,
    es: `Este aviso de privacidad explica qué información recopila Anthony Multiservice, LLC ("nosotros") de sus clientes y visitantes, cómo la usamos y qué opciones tiene usted. Es un borrador pendiente de revisión por un abogado.

## Información que recopilamos
- Datos de contacto que usted nos da: nombre, teléfono, correo, dirección postal, idioma preferido y mejor hora para llamarle.
- Información y documentos que usted entrega para los servicios que solicita (por ejemplo, formularios de impuestos, de registro de compañía o de inmigración), que pueden incluir números de identificación.
- Registros de sus citas, solicitudes y autorizaciones, incluidas la fecha, la hora y la dirección IP de cada autorización.
- Una foto de perfil opcional, si usted la agrega en el portal del cliente.

## Cómo usamos su información
- Para prestar los servicios que usted solicita, según sus instrucciones.
- Para comunicarnos con usted sobre su caso y sus citas, solo por los medios que usted haya autorizado (teléfono, WhatsApp, mensajes de texto, correo).
- Para enviarle promociones solo si usted aceptó recibir mensajes de marketing. Puede quitar ese permiso cuando quiera.
- Para cumplir nuestras obligaciones legales y de registro.

## Cómo protegemos su información
Sus documentos se guardan en un almacenamiento privado y solo los pueden ver nuestro personal y, a través del portal del cliente, usted. No vendemos su información personal.

## Con quién la compartimos
Compartimos información solo cuando es necesario para prestar el servicio que usted pidió (por ejemplo, presentar un formulario ante una agencia del gobierno según sus instrucciones), cuando usted lo autoriza o cuando la ley lo exige.

## Mensajes de texto (SMS)
Si usted acepta recibir mensajes de texto, solo le enviamos avisos sobre sus citas y su caso (por ejemplo, la confirmación o el recordatorio de una cita). La frecuencia de los mensajes varía. Pueden aplicarse tarifas de mensajes y datos. Responda STOP para dejar de recibirlos o HELP para recibir ayuda. No compartimos su número de celular ni su consentimiento para recibir mensajes de texto con terceros ni con empresas afiliadas para sus fines de marketing.

## Sus opciones
En el portal del cliente ("Mis autorizaciones") puede aceptar o quitar en cualquier momento sus preferencias de contacto y de marketing, y actualizar sus datos de contacto ("Mi perfil"). También puede llamarnos para preguntar qué información guardamos sobre usted.

## No somos una firma de abogados
Anthony Multiservice no es una firma de abogados y no da asesoría legal.

## Contacto
Preguntas sobre este aviso: llámenos al (689) 342-6309.`,
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

// How the client gave a permission that staff marked by hand.
export const STAFF_CONSENT_METHODS = ["in_person", "phone", "written", "message"] as const;
export type StaffConsentMethod = (typeof STAFF_CONSENT_METHODS)[number];

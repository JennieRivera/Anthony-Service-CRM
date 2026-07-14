import type { serviceTypeEnum } from "@/lib/db/schema";

type Bilingual = { en: string; es: string };

export type TemplateField = Bilingual;

export type TemplateSection = {
  heading: Bilingual;
  body?: Bilingual[];
  fields?: TemplateField[];
};

export type ServiceTemplate = {
  documentTitle: Bilingual;
  intro: Bilingual;
  sections: TemplateSection[];
  /** Whether to append the Florida notarial certificate block. */
  includeNotaryBlock: boolean;
};

const UPL_DISCLAIMER: Bilingual = {
  en: "Anthony Service, LLC is not a law firm, and no one at Anthony Service, LLC is an attorney licensed to practice law in the State of Florida. We cannot give legal advice, explain your legal rights, select legal forms for you, or represent you before any court or government agency.",
  es: "Anthony Service, LLC no es un bufete de abogados, y nadie en Anthony Service, LLC es abogado(a) autorizado(a) para ejercer la abogacía en el Estado de la Florida. No podemos brindar asesoría legal, explicar sus derechos legales, seleccionar formularios legales por usted, ni representarlo(a) ante ningún tribunal o agencia gubernamental.",
};

const TAX_DISCLAIMER: Bilingual = {
  en: "This checklist is for organizing your tax and bookkeeping documents only and is not tax, accounting, or legal advice. Final figures depend entirely on the accuracy and completeness of the information and documents you provide.",
  es: "Esta lista es únicamente para organizar sus documentos fiscales y de contabilidad, y no constituye asesoría fiscal, contable ni legal. Las cifras finales dependen totalmente de la exactitud y de que la información y los documentos que usted proporcione estén completos.",
};

const FINANCE_DISCLAIMER: Bilingual = {
  en: "Anthony Service, LLC assists with document preparation and organization only. We do not guarantee approval by any lender or institution and do not provide financial or investment advice.",
  es: "Anthony Service, LLC únicamente ayuda con la preparación y organización de documentos. No garantizamos la aprobación por parte de ningún prestamista o institución, ni ofrecemos asesoría financiera o de inversión.",
};

const templates: Record<
  (typeof serviceTypeEnum.enumValues)[number],
  ServiceTemplate
> = {
  online_notary: {
    documentTitle: {
      en: "Remote Online Notarization (RON) Cover Sheet",
      es: "Hoja de Notarización en Línea (RON)",
    },
    intro: {
      en: "Completed at the time of service for a notarization performed by means of two-way audio-video communication technology, in accordance with Florida law.",
      es: "Se completa al momento del servicio para una notarización realizada mediante tecnología de comunicación audiovisual bidireccional, conforme a la ley de la Florida.",
    },
    sections: [
      {
        heading: { en: "Signer Information", es: "Información del Firmante" },
        fields: [
          { en: "Signer Full Name", es: "Nombre Completo del Firmante" },
          { en: "Document(s) to be Notarized", es: "Documento(s) a Notariar" },
          { en: "Signer's Location (City/State)", es: "Ubicación del Firmante (Ciudad/Estado)" },
          { en: "Date & Time of Session", es: "Fecha y Hora de la Sesión" },
          { en: "Fee Charged", es: "Tarifa Cobrada" },
        ],
      },
      {
        heading: { en: "RON Session Details", es: "Detalles de la Sesión RON" },
        body: [
          {
            en: "This session is recorded by audio-video and the recording will be retained in accordance with Florida law and the notary's RON platform policy.",
            es: "Esta sesión se graba en audio y video, y la grabación se conservará conforme a la ley de la Florida y a la política de la plataforma RON del notario.",
          },
        ],
        fields: [
          { en: "RON Platform Used", es: "Plataforma RON Utilizada" },
          { en: "Identity Proofing Method", es: "Método de Verificación de Identidad" },
        ],
      },
    ],
    includeNotaryBlock: true,
  },

  document_prep: {
    documentTitle: {
      en: "Document Preparation Service Intake",
      es: "Hoja de Admisión — Preparación de Documentos",
    },
    intro: {
      en: "This intake sheet records the information you provide so that Anthony Service, LLC can prepare the requested document(s) for your review and signature. This covers general document preparation, immigration paperwork, and apostille/authentication requests.",
      es: "Esta hoja de admisión registra la información que usted proporciona para que Anthony Service, LLC prepare el/los documento(s) solicitado(s) para su revisión y firma. Esto cubre preparación general de documentos, papeleo de inmigración, y solicitudes de apostilla/autenticación.",
    },
    sections: [
      {
        heading: { en: "Request Details", es: "Detalles de la Solicitud" },
        fields: [
          { en: "Document / Service Requested", es: "Documento / Servicio Solicitado" },
          { en: "Purpose", es: "Propósito" },
          { en: "Requested Completion Date", es: "Fecha de Entrega Solicitada" },
          { en: "Delivery Method", es: "Método de Entrega" },
        ],
      },
      {
        heading: {
          en: "Immigration Paperwork (if applicable)",
          es: "Papeleo de Inmigración (si aplica)",
        },
        fields: [
          { en: "Full Legal Name", es: "Nombre Legal Completo" },
          { en: "A-Number (if any)", es: "Número A (si aplica)" },
          { en: "Country of Origin", es: "País de Origen" },
        ],
      },
      {
        heading: {
          en: "Immigration Forms Checklist (check what applies)",
          es: "Lista de Formularios de Inmigración (marque lo que aplique)",
        },
        body: [
          {
            en: "☐ I-130 — Petition for Alien Relative",
            es: "☐ I-130 — Petición de Familiar Extranjero",
          },
          {
            en: "☐ I-140 — Immigrant Petition for Alien Worker",
            es: "☐ I-140 — Petición de Inmigrante Basada en Empleo",
          },
          {
            en: "☐ I-485 — Adjustment of Status (Green Card)",
            es: "☐ I-485 — Ajuste de Estatus (Residencia)",
          },
          {
            en: "☐ I-765 — Work Permit (Employment Authorization)",
            es: "☐ I-765 — Permiso de Trabajo (Autorización de Empleo)",
          },
          {
            en: "☐ I-131 — Travel Document (Advance Parole)",
            es: "☐ I-131 — Permiso de Viaje (Advance Parole)",
          },
          {
            en: "☐ I-90 — Green Card Renewal / Replacement",
            es: "☐ I-90 — Renovación / Reemplazo de Residencia",
          },
          {
            en: "☐ I-751 — Remove Conditions on Residence",
            es: "☐ I-751 — Remover Condiciones de Residencia",
          },
          {
            en: "☐ N-400 — Naturalization (Citizenship)",
            es: "☐ N-400 — Naturalización (Ciudadanía)",
          },
          {
            en: "☐ Nonimmigrant Visa Application (DS-160)",
            es: "☐ Solicitud de Visa de No-Inmigrante (DS-160)",
          },
        ],
        fields: [
          { en: "Other Document(s)", es: "Otro(s) Documento(s)" },
        ],
      },
      {
        heading: {
          en: "Apostille / Authentication (if applicable)",
          es: "Apostilla / Autenticación (si aplica)",
        },
        fields: [
          { en: "Issuing State / Agency", es: "Estado / Agencia que lo Emitió" },
          { en: "Destination Country", es: "País de Destino" },
          { en: "Expedited Service Requested?", es: "¿Servicio Expedito Solicitado?" },
        ],
      },
      {
        heading: { en: "Important Notice", es: "Aviso Importante" },
        body: [UPL_DISCLAIMER],
      },
    ],
    includeNotaryBlock: false,
  },

  tax_prep: {
    documentTitle: {
      en: "Tax & Accounting Intake Sheet",
      es: "Hoja de Admisión — Taxes y Contabilidad",
    },
    intro: {
      en: "Please gather the following information and documents so we can prepare your tax return or bookkeeping accurately and efficiently.",
      es: "Reúna la siguiente información y documentos para que podamos preparar su declaración de impuestos o contabilidad de manera precisa y eficiente.",
    },
    sections: [
      {
        heading: { en: "Filer / Business Information", es: "Información del Declarante / Negocio" },
        fields: [
          { en: "Tax Year / Period", es: "Año / Período Fiscal" },
          { en: "Filing Status", es: "Estado Civil para Efectos Fiscales" },
          { en: "Number of Dependents", es: "Número de Dependientes" },
          { en: "Prior Year AGI (if available)", es: "AGI del Año Anterior (si está disponible)" },
        ],
      },
      {
        heading: { en: "Income Sources (check all that apply)", es: "Fuentes de Ingreso (marque todas las que apliquen)" },
        fields: [
          { en: "W-2 Employment", es: "Empleo W-2" },
          { en: "1099 / Self-Employment", es: "1099 / Trabajo Independiente" },
          { en: "Rental Income", es: "Ingreso por Alquiler" },
          { en: "Business / Bookkeeping Records", es: "Registros de Negocio / Contabilidad" },
          { en: "Other", es: "Otro" },
        ],
      },
      {
        heading: { en: "Important Notice", es: "Aviso Importante" },
        body: [TAX_DISCLAIMER],
      },
    ],
    includeNotaryBlock: false,
  },

  company_registration: {
    documentTitle: {
      en: "Company Registration Intake Sheet",
      es: "Hoja de Admisión — Registro de Compañía",
    },
    intro: {
      en: "This intake sheet organizes the information needed to prepare your business formation or registration paperwork for your review and filing.",
      es: "Esta hoja de admisión organiza la información necesaria para preparar el papeleo de formación o registro de su negocio para su revisión y presentación.",
    },
    sections: [
      {
        heading: { en: "Business Details", es: "Detalles del Negocio" },
        fields: [
          { en: "Proposed Business Name", es: "Nombre Propuesto del Negocio" },
          { en: "Entity Type (LLC, Corp, etc.)", es: "Tipo de Entidad (LLC, Corporación, etc.)" },
          { en: "State of Formation", es: "Estado de Formación" },
          { en: "Business Address", es: "Dirección del Negocio" },
          { en: "Registered Agent", es: "Agente Registrado" },
        ],
      },
      {
        heading: { en: "Owner(s) / Member(s) Information", es: "Información de Dueño(s) / Miembro(s)" },
        fields: [
          { en: "Full Legal Name(s)", es: "Nombre(s) Legal(es) Completo(s)" },
          { en: "Ownership Percentage", es: "Porcentaje de Propiedad" },
          { en: "EIN Requested?", es: "¿EIN Solicitado?" },
        ],
      },
      {
        heading: { en: "Important Notice", es: "Aviso Importante" },
        body: [UPL_DISCLAIMER],
      },
    ],
    includeNotaryBlock: false,
  },

  credit_financing: {
    documentTitle: {
      en: "Credit & Financing Services Intake",
      es: "Hoja de Admisión — Servicios de Crédito y Financiamiento",
    },
    intro: {
      en: "This intake sheet organizes the information needed to assist you with credit or financing-related paperwork.",
      es: "Esta hoja de admisión organiza la información necesaria para ayudarle con el papeleo relacionado con crédito o financiamiento.",
    },
    sections: [
      {
        heading: { en: "Request Details", es: "Detalles de la Solicitud" },
        fields: [
          { en: "Type of Assistance Requested", es: "Tipo de Ayuda Solicitada" },
          { en: "Institution / Lender Name", es: "Nombre de la Institución / Prestamista" },
          { en: "Documents Needed", es: "Documentos Necesarios" },
          { en: "Preferred Contact Method", es: "Método de Contacto Preferido" },
        ],
      },
      {
        heading: { en: "Important Notice", es: "Aviso Importante" },
        body: [FINANCE_DISCLAIMER],
      },
    ],
    includeNotaryBlock: false,
  },

  leadership: {
    documentTitle: {
      en: "Leadership Services Intake Sheet",
      es: "Hoja de Admisión — Servicios de Liderazgo",
    },
    intro: {
      en: "This intake sheet organizes the information needed to plan your leadership coaching, training, or consulting engagement.",
      es: "Esta hoja de admisión organiza la información necesaria para planificar su servicio de coaching, capacitación o consultoría de liderazgo.",
    },
    sections: [
      {
        heading: { en: "Engagement Details", es: "Detalles del Servicio" },
        fields: [
          { en: "Client / Organization Name", es: "Nombre del Cliente / Organización" },
          { en: "Type of Service (coaching, training, workshop)", es: "Tipo de Servicio (coaching, capacitación, taller)" },
          { en: "Goals for This Engagement", es: "Objetivos de Este Servicio" },
          { en: "Number of Participants", es: "Número de Participantes" },
          { en: "Preferred Schedule", es: "Horario Preferido" },
        ],
      },
    ],
    includeNotaryBlock: false,
  },
};

export function getServiceTemplate(
  serviceType: (typeof serviceTypeEnum.enumValues)[number],
): ServiceTemplate {
  return templates[serviceType];
}

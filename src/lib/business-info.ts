// Central place for Anthony Multiservice, LLC's public business contact details,
// used across invoice PDFs, case templates, and the online payment options.
export const businessInfo = {
  name: "Anthony Multiservice, LLC",
  address: "2610 Orchid Ln, Kissimmee, FL",
  phone: "(689) 342-6309",
  /** Email/phone registered with Zelle for receiving manual transfers. */
  zelleContact: "anthonyservice4@gmail.com",
  /**
   * PayPal.me handle (the part after paypal.me/) or full PayPal email used
   * for receiving payments. Set to null until confirmed.
   */
  paypalMeHandle: null as string | null,
};

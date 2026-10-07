import { businessInfo } from "@/lib/business-info";

// Diamante Conecta 360 emails (sent from avisos@ through Resend). Plain,
// short, bilingual by the recipient's language. The not-a-law-firm /
// NMLS one-liner goes at the bottom like every automatic email.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function wrap(lines: string[], footer: string) {
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1f2a24;line-height:1.5">${lines
    .map((l) => `<p style="margin:0 0 12px">${l}</p>`)
    .join("")}<p style="margin:24px 0 0;font-size:12px;color:#5b6573">${esc(footer)}</p></div>`;
  return html;
}
const strip = (html: string) => html.replace(/<[^>]+>/g, "");

export function codeEmail(params: { code: string; purpose: "signup" | "login"; locale: "es" | "en"; legalLine: string }) {
  const es = params.locale === "es";
  const subject = es ? `Su código de Diamante Conecta 360: ${params.code}` : `Your Diamante Conecta 360 code: ${params.code}`;
  const lines = [
    es
      ? params.purpose === "signup"
        ? "Gracias por su interés en Diamante Conecta 360, la red de aliados de Anthony Multiservice."
        : "Recibimos una solicitud para entrar a Diamante Conecta 360 con este correo."
      : params.purpose === "signup"
        ? "Thank you for your interest in Diamante Conecta 360, the Anthony Multiservice partner network."
        : "We received a request to sign in to Diamante Conecta 360 with this email.",
    `${es ? "Su código es" : "Your code is"}: <strong style="font-size:22px;letter-spacing:4px">${esc(params.code)}</strong>`,
    es ? "Vence en 10 minutos. Si usted no lo pidió, ignore este correo." : "It expires in 10 minutes. If you didn't ask for it, ignore this email.",
  ];
  const html = wrap(lines, params.legalLine);
  return { subject, html, text: lines.map(strip).join("\n\n") + `\n\n${params.legalLine}` };
}

export function approvedEmail(params: { name: string; accessUrl: string; locale: "es" | "en"; legalLine: string }) {
  const es = params.locale === "es";
  const subject = es ? "Bienvenido a Diamante Conecta 360" : "Welcome to Diamante Conecta 360";
  const lines = [
    es ? `Hola, ${esc(params.name)}:` : `Hello, ${esc(params.name)}:`,
    es
      ? "Anthony Multiservice aprobó su acceso a Diamante Conecta 360, la red de aliados de Anthony Multiservice."
      : "Anthony Multiservice approved your access to Diamante Conecta 360, the Anthony Multiservice partner network.",
    es
      ? `Para entrar, abra <a href="${esc(params.accessUrl)}">${esc(params.accessUrl)}</a>, elija "Entrar con mi correo" y escriba este correo: le enviaremos un código de 6 dígitos.`
      : `To sign in, open <a href="${esc(params.accessUrl)}">${esc(params.accessUrl)}</a>, choose "Sign in with my email" and enter this email: we'll send you a 6-digit code.`,
    es ? `¿Preguntas? Llámenos al ${esc(businessInfo.phone)}.` : `Questions? Call us at ${esc(businessInfo.phone)}.`,
  ];
  const html = wrap(lines, params.legalLine);
  return { subject, html, text: lines.map(strip).join("\n\n") + `\n\n${params.legalLine}` };
}

// To the owner: a new application is waiting.
export function applicationNoticeEmail(params: { businessName: string; contactPerson: string; city: string; allyType: string; recordUrl: string; duplicateOf: string | null }) {
  const subject = `Nueva solicitud de aliado (Diamante Conecta 360): ${params.businessName}`;
  const lines = [
    `<strong>${esc(params.businessName)}</strong> pidió unirse a Diamante Conecta 360 y confirmó su correo.`,
    `Contacto: ${esc(params.contactPerson)} · ${esc(params.city)} · ${esc(params.allyType)}`,
    ...(params.duplicateOf ? [`Posible duplicado de: ${esc(params.duplicateOf)}`] : []),
    `Revísela y apruébela en la ficha: <a href="${esc(params.recordUrl)}">${esc(params.recordUrl)}</a>`,
  ];
  const html = wrap(lines, "Aviso automático del CRM.");
  return { subject, html, text: lines.map(strip).join("\n\n") };
}

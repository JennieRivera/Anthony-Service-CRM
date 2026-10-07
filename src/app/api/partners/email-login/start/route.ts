import { checkBotId } from "botid/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { logAuditEvent } from "@/lib/audit";
import { startEmailLogin } from "@/lib/partners/conecta";
import { codeEmail } from "@/lib/partners/conectaEmails";
import { getLegalTexts, pickLocale } from "@/lib/legal/texts";
import { isEmailConfigured, realSenders } from "@/lib/notifications/providers";
import { partnerIpKey } from "@/lib/partners/tokens";
import { partnerDb } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";
import { requestIp } from "@/lib/request-info";

// "Sign in with my email", step 1 — a session lifecycle route (there is no
// session yet). Always the same answer whether or not the email belongs to
// an active, approved alliance: a code is only emailed when it does.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  if (!isDatabaseConfigured() || !isEmailConfigured()) return json({ error: "unavailable" }, 503);
  const verification = await checkBotId();
  if (verification.isBot) return json({ error: "bot" }, 403);
  const body = (await readSmallJson(request)) as { email?: unknown; locale?: unknown } | null;
  if (!body) return badRequest();

  const db = partnerDb();
  const ip = requestIp(request.headers);
  const { send, rateLimited } = await startEmailLogin(db, { email: body.email, ipKey: ip ? partnerIpKey(ip) : null });
  if (rateLimited) return json({ error: "rate_limited" }, 429);
  if (send) {
    const locale = body.locale === "en" ? "en" : "es";
    const legal = await getLegalTexts(db);
    const mail = codeEmail({ code: send.code, purpose: "login", locale, legalLine: pickLocale(legal.conecta_not_a_law_firm_email, locale) });
    const sent = await realSenders.email({ to: send.email, ...mail });
    await logAuditEvent({
      action: "partner.email_code_sent",
      entityType: "alliance",
      entityId: send.allianceId,
      summary: sent.ok ? "Diamante Conecta 360: sign-in code emailed" : `Diamante Conecta 360: sign-in code email failed (${sent.error})`,
      actor: `partner-portal:${send.allianceId}`,
    });
  }
  return json({ ok: true });
}

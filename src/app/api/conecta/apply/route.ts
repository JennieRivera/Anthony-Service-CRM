import { checkBotId } from "botid/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { logAuditEvent } from "@/lib/audit";
import { ConectaValidationError, startConectaApplication } from "@/lib/partners/conecta";
import { codeEmail } from "@/lib/partners/conectaEmails";
import { getLegalTexts, pickLocale } from "@/lib/legal/texts";
import { isEmailConfigured, realSenders } from "@/lib/notifications/providers";
import { partnerIpKey } from "@/lib/partners/tokens";
import { partnerDb } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";
import { requestIp } from "@/lib/request-info";

// "Join Diamante Conecta 360", step 1: BotID + a trap field + limits per
// IP and email, then a 6-digit code to the applicant's email. Nothing
// reaches the CRM until the code is confirmed (step 2, /api/conecta/verify).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  if (!isDatabaseConfigured() || !isEmailConfigured()) return json({ error: "unavailable" }, 503);
  const verification = await checkBotId();
  if (verification.isBot) return json({ error: "bot" }, 403);

  const body = (await readSmallJson(request, 32768)) as { application?: Record<string, unknown> } | null;
  if (!body?.application || typeof body.application !== "object") return badRequest();
  // Trap field: invisible to people; a bot that fills it gets a fake "ok".
  if (typeof body.application.company === "string" && body.application.company.trim() !== "") return json({ ok: true });

  const db = partnerDb();
  const ip = requestIp(request.headers);
  let started;
  try {
    started = await startConectaApplication(db, { input: body.application, ipKey: ip ? partnerIpKey(ip) : null });
  } catch (err) {
    if (err instanceof ConectaValidationError) return json({ error: err.code }, 400);
    throw err;
  }
  if (!started.ok) return json({ error: "rate_limited" }, 429);

  const legal = await getLegalTexts(db);
  const mail = codeEmail({
    code: started.code,
    purpose: "signup",
    locale: started.locale,
    legalLine: pickLocale(legal.conecta_not_a_law_firm_email, started.locale),
  });
  const sent = await realSenders.email({ to: started.email, ...mail });
  await logAuditEvent({
    action: "conecta.application_code_sent",
    entityType: "partner_email_code",
    summary: sent.ok ? "Diamante Conecta 360: application code emailed" : `Diamante Conecta 360: application code email failed (${sent.error})`,
    actor: "diamante-conecta-360",
  });
  if (!sent.ok) return json({ error: "send_failed" }, 502);
  return json({ ok: true });
}

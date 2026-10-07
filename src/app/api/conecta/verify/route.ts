import { isDatabaseConfigured } from "@/lib/db/config";
import { logAuditEvent } from "@/lib/audit";
import { verifyConectaApplication } from "@/lib/partners/conecta";
import { applicationNoticeEmail } from "@/lib/partners/conectaEmails";
import { realSenders } from "@/lib/notifications/providers";
import { partnerIpKey } from "@/lib/partners/tokens";
import { partnerDb } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";
import { requestIp, requestUserAgent } from "@/lib/request-info";

// "Join Diamante Conecta 360", step 2: the right code → a Prospect
// alliance + consents (date, IP) + a review task + an email to the owner.
// No portal access until staff approves it.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  if (!isDatabaseConfigured()) return json({ error: "unavailable" }, 503);
  const body = (await readSmallJson(request)) as { email?: unknown; code?: unknown } | null;
  if (!body) return badRequest();

  const ip = requestIp(request.headers);
  const result = await verifyConectaApplication(partnerDb(), {
    email: body.email,
    code: body.code,
    ipKey: ip ? partnerIpKey(ip) : null,
    ipAddress: ip,
    userAgent: requestUserAgent(request.headers),
  });
  if (!result.ok) return json({ error: result.reason }, result.reason === "rate_limited" ? 429 : 400);

  await logAuditEvent({
    action: "conecta.application_received",
    entityType: "alliance",
    entityId: result.allianceId,
    summary: `Diamante Conecta 360: application from ${result.app.businessName} (email confirmed)`,
    actor: "diamante-conecta-360",
  });
  const owner = process.env.ADMIN_EMAIL;
  if (owner) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
    await realSenders
      .email({
        to: owner,
        ...applicationNoticeEmail({
          businessName: result.app.businessName,
          contactPerson: result.app.contactPerson,
          city: result.app.city,
          allyType: result.app.allyType,
          recordUrl: `${proto}://${host}/es/alliances/${result.allianceId}`,
          duplicateOf: result.duplicateOf,
        }),
      })
      .catch(() => undefined);
  }
  return json({ ok: true });
}

import { getTranslations } from "next-intl/server";
import { logAuditEvent } from "@/lib/audit";
import { getLegalTexts, pickLocale } from "@/lib/legal/texts";
import {
  PORTAL_AUTHORIZATIONS,
  PortalLimitError,
  PortalValidationError,
  savePortalAuthorizations,
  type AuthorizationTexts,
} from "@/lib/portal/account";
import { portalDb, requirePortalSessionForApi } from "@/lib/portal/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";
import { requestIp, requestUserAgent } from "@/lib/request-info";

// My authorizations: the client accepts or withdraws each box. Every
// change is stored as append-only evidence (date/time, IP, browser, the
// exact text shown in the client's language) and in the audit log; the
// contact-channel boxes also update the CRM's Communication Preferences.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePortalSessionForApi();
  if (response) return response;

  const body = (await readSmallJson(request)) as
    | { choices?: unknown; signatureName?: unknown; locale?: unknown }
    | null;
  if (!body) return badRequest();
  const locale = body.locale === "es" ? "es" : "en";

  const db = portalDb();
  const [t, legal] = await Promise.all([
    getTranslations({ locale, namespace: "Portal.authorizations.items" }),
    getLegalTexts(db),
  ]);
  const texts = Object.fromEntries(
    PORTAL_AUTHORIZATIONS.map((a) => [
      a,
      a === "document_processing"
        ? pickLocale(legal.document_processing_authorization, locale)
        : // SMS: the evidence includes the disclosure shown under the box.
          a === "sms"
          ? `${t("sms.label")} ${t("sms.help")}`
          : t(`${a}.label`),
    ]),
  ) as AuthorizationTexts;

  try {
    const { changed } = await savePortalAuthorizations(db, {
      clientId: session.clientId,
      choices: body.choices,
      signatureName: body.signatureName,
      texts,
      ipAddress: requestIp(request.headers),
      userAgent: requestUserAgent(request.headers),
    });
    if (changed.length > 0) {
      await logAuditEvent({
        action: "portal.authorizations_updated",
        entityType: "client",
        entityId: session.clientId,
        summary: `Client updated authorizations through the portal — ${changed
          .map((c) => `${c.type}:${c.granted ? "granted" : "withdrawn"}`)
          .join(" ")}`,
        actor: `client-portal:${session.clientId}`,
      });
    }
    return json({ ok: true, changed: changed.length });
  } catch (err) {
    if (err instanceof PortalValidationError) return json({ error: err.code }, 400);
    if (err instanceof PortalLimitError) return json({ error: "limit_reached" }, 429);
    throw err;
  }
}

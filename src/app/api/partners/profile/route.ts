import { logAuditEvent } from "@/lib/audit";
import {
  PartnerLimitError,
  PartnerValidationError,
  getPartnerAlliance,
  recordPartnerConsent,
  savePartnerProfile,
} from "@/lib/partners/queries";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";
import { requestIp, requestUserAgent } from "@/lib/request-info";

// "My profile": changes apply right away and create a task for staff.
// A contractor (Remodeling) must confirm its Florida license and insurance
// when it saves them — stored as evidence with date and IP.
export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;

  const body = (await readSmallJson(request, 16384)) as {
    values?: unknown;
    licenseConfirmed?: unknown;
    licenseConfirmText?: unknown;
  } | null;
  if (!body || !body.values || typeof body.values !== "object") return badRequest();

  const db = partnerDb();
  const alliance = await getPartnerAlliance(db, session.allianceId);
  if (!alliance) return badRequest();
  const values = body.values as Record<string, unknown>;
  const touchesLicense = ["licenseNumber", "licenseExpiration", "insuranceProvider", "insuranceExpiration"].some(
    (f) => typeof values[f] === "string" && (values[f] as string).trim() !== "",
  );
  const isContractor = alliance.organizationType === "contractor_remodeling";
  if (isContractor && touchesLicense && body.licenseConfirmed !== true) return json({ error: "license_confirmation" }, 400);

  try {
    const { changed } = await savePartnerProfile(db, { allianceId: session.allianceId, values });
    if (isContractor && touchesLicense && changed.length > 0 && typeof body.licenseConfirmText === "string") {
      await recordPartnerConsent(db, {
        allianceId: session.allianceId,
        type: "license_insurance",
        textShown: body.licenseConfirmText.slice(0, 1000),
        ipAddress: requestIp(request.headers),
        userAgent: requestUserAgent(request.headers),
      });
    }
    if (changed.length > 0) {
      await logAuditEvent({
        action: "partner.profile_changed",
        entityType: "alliance",
        entityId: session.allianceId,
        summary: `Alliance updated its profile in the partner portal: ${changed.join(", ")}`,
        actor: `partner-portal:${session.allianceId}`,
      });
    }
    return json({ ok: true, changed });
  } catch (err) {
    if (err instanceof PartnerValidationError) return json({ error: err.code }, 400);
    if (err instanceof PartnerLimitError) return json({ error: "limit_reached" }, 429);
    throw err;
  }
}

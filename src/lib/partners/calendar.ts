import { and, asc, count, eq, gt, gte, inArray, ne, or } from "drizzle-orm";
import { appointments, clientCommunicationPreferences, referrals, strategicAlliances, tasks } from "@/lib/db/schema";
import type { PortalDb } from "@/lib/portal/db";
import { PARTNER_MAX_MEETING_REQUESTS_PER_DAY } from "./config";
import { PartnerLimitError, PartnerValidationError } from "./queries";

// The ally's calendar (partner portal, Phase B4). The rules, tested in
// isolation.test.ts:
//   1. Meetings with AMS: only appointments staff marked "show in the
//      ally's calendar" (partnerVisible) for THIS alliance — date, time,
//      title, type, place and status; never the client or notes.
//   2. Its referrals' appointments: only date and service, and only for
//      clients who gave their partner-sharing consent. Never the client,
//      title, place or notes.

const DAY_MS = 24 * 60 * 60 * 1000;
const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/g, "").trim().slice(0, max) : "";

export type PartnerMeeting = {
  id: string;
  startAt: string;
  endAt: string;
  title: string;
  appointmentType: string;
  location: string | null;
  status: string;
};
export type PartnerReferralAppointment = { startAt: string; serviceType: string };

export async function listPartnerCalendar(db: PortalDb, allianceId: string, now = new Date()) {
  const since = new Date(now.getTime() - 30 * DAY_MS);
  const meetings = await db
    .select({
      id: appointments.id,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      title: appointments.title,
      appointmentType: appointments.appointmentType,
      location: appointments.location,
      status: appointments.status,
    })
    .from(appointments)
    .where(and(eq(appointments.allianceId, allianceId), eq(appointments.partnerVisible, true), gte(appointments.startAt, since)))
    .orderBy(asc(appointments.startAt));

  // Clients of this ally's referrals (sent by it, sent to it, or assigned
  // to it) that consented to sharing with allies.
  const referred = await db
    .selectDistinct({ clientId: referrals.clientId })
    .from(referrals)
    .innerJoin(clientCommunicationPreferences, eq(clientCommunicationPreferences.clientId, referrals.clientId))
    .where(
      and(
        eq(clientCommunicationPreferences.partnerReferralConsent, true),
        or(eq(referrals.allianceId, allianceId), eq(referrals.assignedAllianceId, allianceId)),
      ),
    );
  const referralAppointments = referred.length
    ? await db
        .select({ startAt: appointments.startAt, serviceType: appointments.serviceType })
        .from(appointments)
        .where(
          and(
            inArray(
              appointments.clientId,
              referred.map((r) => r.clientId),
            ),
            eq(appointments.partnerVisible, false),
            ne(appointments.status, "cancelled"),
            gte(appointments.startAt, since),
          ),
        )
        .orderBy(asc(appointments.startAt))
    : [];

  return {
    meetings: meetings.map((m) => ({ ...m, startAt: m.startAt.toISOString(), endAt: m.endAt.toISOString() })) as PartnerMeeting[],
    referralAppointments: referralAppointments.map((a) => ({ startAt: a.startAt.toISOString(), serviceType: a.serviceType })) as PartnerReferralAppointment[],
  };
}

export const MEETING_MODES = ["in_person", "phone", "video"] as const;

// "Request a meeting": a task for staff to confirm (staff then creates the
// appointment and ticks "show in the ally's calendar").
export async function requestPartnerMeeting(db: PortalDb, params: { allianceId: string; input: unknown; now?: Date }) {
  const now = params.now ?? new Date();
  const input = (params.input && typeof params.input === "object" ? params.input : {}) as Record<string, unknown>;
  const topic = clean(input.topic, 300);
  if (topic.length < 2) throw new PartnerValidationError("topic");
  const preferred = clean(input.preferred, 300);
  if (preferred.length < 2) throw new PartnerValidationError("preferred");
  const mode = (MEETING_MODES as readonly unknown[]).includes(input.mode) ? (input.mode as (typeof MEETING_MODES)[number]) : "in_person";
  const note = clean(input.note, 1000);

  const [recent] = await db
    .select({ n: count() })
    .from(tasks)
    .where(and(eq(tasks.allianceId, params.allianceId), eq(tasks.type, "partner_meeting_request"), gt(tasks.createdAt, new Date(now.getTime() - DAY_MS))));
  if ((recent?.n ?? 0) >= PARTNER_MAX_MEETING_REQUESTS_PER_DAY) throw new PartnerLimitError("Too many meeting requests today");

  const [ally] = await db
    .select({ name: strategicAlliances.organizationName })
    .from(strategicAlliances)
    .where(eq(strategicAlliances.id, params.allianceId))
    .limit(1);
  // English mode labels, translated on display (titles.ts).
  const modeLabel = { in_person: "in person", phone: "phone", video: "video call" }[mode];
  await db.insert(tasks).values({
    allianceId: params.allianceId,
    type: "partner_meeting_request",
    title: `Meeting request from ${ally?.name ?? "an ally"}: ${topic} — preferred: ${preferred} (${modeLabel})${note ? ` — note: ${note}` : ""}`.slice(0, 2000),
    createdAt: now,
  });
}

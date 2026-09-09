import { and, asc, desc, eq, gte, ilike, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appointments, clients, companies, cases } from "@/lib/db/schema";

// Calendar enhancement, Session 6 (section 10) — every dimension is
// optional and additive (AND'd together); "Personal Asignado" is
// deliberately absent since there's no populated staff/role system yet
// (see AGENTS.md / CALENDAR-PLAN.md section 13 deferral).
export type AppointmentListFilters = {
  serviceType?: string;
  status?: string;
  appointmentType?: string;
  client?: string;
  location?: string;
  date?: string;
  language?: string;
  referralSource?: string;
};

export async function listAppointmentsWithClient(
  filters: AppointmentListFilters = {},
) {
  const conditions = [
    filters.serviceType
      ? eq(
          appointments.serviceType,
          filters.serviceType as (typeof appointments.serviceType.enumValues)[number],
        )
      : undefined,
    filters.status
      ? eq(
          appointments.status,
          filters.status as (typeof appointments.status.enumValues)[number],
        )
      : undefined,
    filters.appointmentType
      ? eq(
          appointments.appointmentType,
          filters.appointmentType as (typeof appointments.appointmentType.enumValues)[number],
        )
      : undefined,
    filters.client ? ilike(clients.fullName, `%${filters.client}%`) : undefined,
    filters.location
      ? ilike(appointments.location, `%${filters.location}%`)
      : undefined,
    filters.referralSource
      ? ilike(appointments.referralSource, `%${filters.referralSource}%`)
      : undefined,
    filters.language
      ? eq(
          clients.preferredLanguage,
          filters.language as (typeof clients.preferredLanguage.enumValues)[number],
        )
      : undefined,
    filters.date
      ? and(
          gte(appointments.startAt, new Date(`${filters.date}T00:00:00`)),
          lt(appointments.startAt, new Date(`${filters.date}T23:59:59.999`)),
        )
      : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  return getDb()
    .select({
      id: appointments.id,
      title: appointments.title,
      serviceType: appointments.serviceType,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      location: appointments.location,
      status: appointments.status,
      clientId: clients.id,
      clientName: clients.fullName,
    })
    .from(appointments)
    .innerJoin(clients, eq(appointments.clientId, clients.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(appointments.startAt));
}

export async function listUpcomingAppointments(limit = 5) {
  return getDb()
    .select({
      id: appointments.id,
      title: appointments.title,
      serviceType: appointments.serviceType,
      startAt: appointments.startAt,
      clientName: clients.fullName,
    })
    .from(appointments)
    .innerJoin(clients, eq(appointments.clientId, clients.id))
    .where(gte(appointments.startAt, new Date()))
    .orderBy(asc(appointments.startAt))
    .limit(limit);
}

// Feeds the Communications form's appointment picker — same unscoped
// "fetch everything, let staff pick" pattern already used there for
// cases/referrals (listCasesForSelect/listReferralsForSelect).
export async function listAppointmentsForSelect() {
  return getDb()
    .select({ id: appointments.id, title: appointments.title, startAt: appointments.startAt })
    .from(appointments)
    .orderBy(desc(appointments.startAt));
}

export async function getAppointmentById(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      appointment: appointments,
      client: clients,
      companyName: companies.legalBusinessName,
      caseTitle: cases.title,
    })
    .from(appointments)
    .innerJoin(clients, eq(appointments.clientId, clients.id))
    .leftJoin(companies, eq(clients.companyId, companies.id))
    .leftJoin(cases, eq(appointments.caseId, cases.id))
    .where(eq(appointments.id, id))
    .limit(1);

  return row ?? null;
}

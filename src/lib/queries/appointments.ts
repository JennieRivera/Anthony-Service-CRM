import { asc, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appointments, clients } from "@/lib/db/schema";

export async function listAppointmentsWithClient() {
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

export async function getAppointmentById(id: string) {
  const db = getDb();
  const [row] = await db
    .select({ appointment: appointments, client: clients })
    .from(appointments)
    .innerJoin(clients, eq(appointments.clientId, clients.id))
    .where(eq(appointments.id, id))
    .limit(1);

  return row ?? null;
}

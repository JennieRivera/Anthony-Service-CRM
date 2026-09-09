import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { academyDiamondMembers, clients, cases } from "@/lib/db/schema";

// Diamond Community roster — membership only, never a message log (see
// the comment on academyDiamondMembers in schema.ts). Students join to
// their existing client/case for name and program; teacher rows carry
// their own name/phone/email since they have no client or staff record.
export async function listDiamondMembers() {
  return getDb()
    .select({
      id: academyDiamondMembers.id,
      memberType: academyDiamondMembers.memberType,
      clientId: academyDiamondMembers.clientId,
      caseId: academyDiamondMembers.caseId,
      name: academyDiamondMembers.name,
      phone: academyDiamondMembers.phone,
      email: academyDiamondMembers.email,
      joinedDate: academyDiamondMembers.joinedDate,
      status: academyDiamondMembers.status,
      notes: academyDiamondMembers.notes,
      studentName: clients.fullName,
      program: cases.title,
    })
    .from(academyDiamondMembers)
    .leftJoin(clients, eq(academyDiamondMembers.clientId, clients.id))
    .leftJoin(cases, eq(academyDiamondMembers.caseId, cases.id))
    .orderBy(asc(academyDiamondMembers.joinedDate));
}

// Feeds the "add member" form's student picker — only real Academy
// students (serviceType "academy"), so staff can't accidentally add an
// unrelated client to a VIP academy space.
export async function listAcademyStudentsForSelect() {
  return getDb()
    .select({
      caseId: cases.id,
      clientId: cases.clientId,
      studentName: clients.fullName,
      title: cases.title,
    })
    .from(cases)
    .innerJoin(clients, eq(cases.clientId, clients.id))
    .where(eq(cases.serviceType, "academy"))
    .orderBy(asc(clients.fullName));
}

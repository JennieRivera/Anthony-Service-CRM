import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

export async function listRecentAuditLog(limit = 200) {
  return getDb()
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

// B2B Network Foundation, section 20 — reuses the one existing audit_log
// table for an entity's activity/history (e.g. a single B2B Alliance),
// rather than building a second audit system. entityId on auditLog is
// text (not a typed FK) since it's shared across every entity type the
// audit log already covers.
export async function listAuditLogForEntity(entityType: string, entityId: string, limit = 100) {
  return getDb()
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId)))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

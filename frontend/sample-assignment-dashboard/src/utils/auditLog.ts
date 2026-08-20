/**
 * Lightweight audit logging stub for assignment changes.
 *
 * INTEGRATION POINT: In production this should call a durable, append-only
 * audit service (or the LIS's own audit trail) rather than an in-memory
 * array, and should include the authenticated user's verified identity
 * (e.g. from a signed session/JWT) rather than a client-supplied value.
 */
import type { AssignmentHistoryEntry } from '../models/types';

const auditLog: AssignmentHistoryEntry[] = [];

export function recordAuditEntry(entry: AssignmentHistoryEntry): void {
  // AUDIT LOGGING: persist to backend audit store here.
  auditLog.push(entry);
}

export function getAuditLog(): AssignmentHistoryEntry[] {
  return [...auditLog];
}

export function clearAuditLogForTesting(): void {
  auditLog.length = 0;
}

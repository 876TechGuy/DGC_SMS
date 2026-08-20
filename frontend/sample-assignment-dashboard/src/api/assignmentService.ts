/**
 * Mock API/service module standing in for a real backend (which would in
 * turn talk to a Laboratory Information System, LIMS, or similar).
 *
 * All functions are async and simulate network latency + occasional
 * failure so that UI loading/error states are exercised realistically.
 * Swap this module out for real HTTP calls when integrating with a live
 * system - the rest of the app only depends on this module's exported
 * function signatures.
 */
import {
  buildAssignmentRecords,
  mockAnalysts,
} from '../data/mockData';
import type {
  Analyst,
  AssignmentHistoryEntry,
  AssignmentRecord,
  AssignmentStatus,
} from '../models/types';
import { recordAuditEntry } from '../utils/auditLog';

// In-memory "database" seeded from mock data. Mutated by service calls
// below to simulate persistence for the lifetime of the page session.
let records: AssignmentRecord[] = buildAssignmentRecords();

const NETWORK_DELAY_MS = 150;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), NETWORK_DELAY_MS));
}

export class AssignmentServiceError extends Error {}

/** Fetches all assignment records. Server-side, this endpoint must enforce RBAC too. */
export async function fetchAssignmentRecords(): Promise<AssignmentRecord[]> {
  return delay(records.map((record) => ({ ...record })));
}

export async function fetchAnalysts(): Promise<Analyst[]> {
  return delay([...mockAnalysts]);
}

export interface ReassignInput {
  assignmentId: string;
  newAnalystId: string;
  performedBy: string;
  reason: string;
}

/**
 * Reassigns (or newly assigns) a test to an analyst.
 *
 * AUTHZ CHECK: callers must have already verified `canManageAssignment`
 * for the acting user before invoking this - the mock layer does not
 * re-derive the caller's identity, but a real backend endpoint MUST
 * independently authorize this request server-side rather than trusting
 * the client.
 */
export async function reassignTest(input: ReassignInput): Promise<AssignmentRecord> {
  const { assignmentId, newAnalystId, performedBy, reason } = input;
  if (!reason.trim()) {
    throw new AssignmentServiceError('A reassignment reason is required.');
  }
  const target = records.find((r) => r.assignment.id === assignmentId);
  if (!target) {
    throw new AssignmentServiceError(`Assignment ${assignmentId} not found.`);
  }
  const analyst = mockAnalysts.find((a) => a.id === newAnalystId);
  if (!analyst) {
    throw new AssignmentServiceError(`Analyst ${newAnalystId} not found.`);
  }
  if (analyst.activeStatus !== 'Active') {
    throw new AssignmentServiceError(`${analyst.displayName} is not an active analyst.`);
  }

  const previousAnalystId = target.assignment.analystId;
  const nowIso = new Date().toISOString();
  const wasUnassigned = previousAnalystId === null;

  const historyEntry: AssignmentHistoryEntry = {
    id: `history-${Date.now()}`,
    assignmentId,
    action: wasUnassigned ? 'Assigned' : 'Reassigned',
    performedBy,
    performedDateTime: nowIso,
    fromAnalystId: previousAnalystId,
    toAnalystId: newAnalystId,
    fromStatus: target.assignment.status,
    toStatus: 'Assigned',
    reason: wasUnassigned ? null : reason,
  };

  records = records.map((r) => {
    if (r.assignment.id !== assignmentId) return r;
    return {
      ...r,
      analyst,
      test: { ...r.test, assignedAnalystId: newAnalystId, assignedBy: performedBy, assignedDateTime: nowIso },
      assignment: {
        ...r.assignment,
        analystId: newAnalystId,
        assignedBy: performedBy,
        assignedDateTime: nowIso,
        status: 'Assigned',
        reassignmentReason: wasUnassigned ? null : reason,
      },
      history: [...r.history, historyEntry],
    };
  });

  recordAuditEntry(historyEntry);
  const updated = records.find((r) => r.assignment.id === assignmentId)!;
  return delay({ ...updated });
}

export interface UpdateStatusInput {
  assignmentId: string;
  newStatus: AssignmentStatus;
  performedBy: string;
  blockedReason?: string | null;
}

/**
 * Updates the workflow status of an assignment (e.g. accept, start, complete,
 * put on hold, escalate). Only the assigned analyst or a supervisor should
 * be permitted to call this - enforced by `canUpdateOwnAssignment` at the
 * UI layer, and MUST also be enforced server-side in a real deployment.
 */
export async function updateAssignmentStatus(
  input: UpdateStatusInput,
): Promise<AssignmentRecord> {
  const { assignmentId, newStatus, performedBy, blockedReason } = input;
  const target = records.find((r) => r.assignment.id === assignmentId);
  if (!target) {
    throw new AssignmentServiceError(`Assignment ${assignmentId} not found.`);
  }
  if (newStatus === 'On Hold' && !blockedReason?.trim()) {
    throw new AssignmentServiceError('A reason is required to put work on hold.');
  }

  const nowIso = new Date().toISOString();
  const historyEntry: AssignmentHistoryEntry = {
    id: `history-${Date.now()}`,
    assignmentId,
    action: newStatus === 'Escalated' ? 'Escalated' : 'StatusChanged',
    performedBy,
    performedDateTime: nowIso,
    fromAnalystId: target.assignment.analystId,
    toAnalystId: target.assignment.analystId,
    fromStatus: target.assignment.status,
    toStatus: newStatus,
    reason: blockedReason ?? null,
  };

  records = records.map((r) => {
    if (r.assignment.id !== assignmentId) return r;
    return {
      ...r,
      test: {
        ...r.test,
        status: newStatus,
        blockedReason: newStatus === 'On Hold' ? blockedReason ?? null : null,
        completedDateTime: newStatus === 'Completed' ? nowIso : r.test.completedDateTime,
      },
      assignment: { ...r.assignment, status: newStatus },
      history: [...r.history, historyEntry],
    };
  });

  recordAuditEntry(historyEntry);
  const updated = records.find((r) => r.assignment.id === assignmentId)!;
  return delay({ ...updated });
}

/** Test-only helper to reset the in-memory store between test cases. */
export function __resetForTesting(): void {
  records = buildAssignmentRecords();
}

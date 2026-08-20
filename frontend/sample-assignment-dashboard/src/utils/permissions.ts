/**
 * Role-based access control (RBAC) helpers.
 *
 * NOTE: This is a client-side convenience layer only. In a production
 * deployment, authorization MUST also be enforced server-side (e.g. in the
 * mock/real API layer and at the LIS integration boundary) since a client
 * can never be trusted to self-report permissions.
 */
import type {
  AssignmentRecord,
  AuthenticatedUser,
} from '../models/types';

/** Returns true when the user is allowed to see the full analyst roster (supervisor view). */
export function canViewAllAssignments(user: AuthenticatedUser): boolean {
  return user.role === 'supervisor';
}

/** Returns true when the user may create or change an assignment. */
export function canManageAssignment(user: AuthenticatedUser): boolean {
  // AUTHZ CHECK: In a real system this would also confirm the supervisor
  // has jurisdiction over the specific department/branch of the assignment
  // before allowing the mutation to proceed.
  return user.role === 'supervisor' && user.canManageAssignments;
}

/** Returns true when the user may accept/update the status of a specific assignment. */
export function canUpdateOwnAssignment(
  user: AuthenticatedUser,
  record: AssignmentRecord,
): boolean {
  if (user.role === 'supervisor') return true;
  return user.role === 'analyst' && record.assignment.analystId === user.id;
}

/**
 * Filters the full set of assignment records down to what `user` is
 * permitted to see.
 *
 * - Supervisors see everything.
 * - Analysts only ever see work assigned to them (row-level RBAC).
 */
export function visibleAssignmentsFor(
  user: AuthenticatedUser,
  records: AssignmentRecord[],
): AssignmentRecord[] {
  if (canViewAllAssignments(user)) return records;
  return records.filter((record) => record.assignment.analystId === user.id);
}

/**
 * Redacts subject/patient identifying information for users who lack
 * explicit permission to view it. Demo data already uses synthetic
 * identifiers, but real integrations must still apply this redaction to
 * genuine patient/subject data.
 */
export function redactSensitiveFields(
  user: AuthenticatedUser,
  record: AssignmentRecord,
): AssignmentRecord {
  if (user.canViewSensitiveData) return record;
  return {
    ...record,
    sample: {
      ...record.sample,
      patientOrSubjectReference: 'Restricted',
    },
  };
}

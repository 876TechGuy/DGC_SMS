import type {
  AssignmentRecord,
  AuthenticatedUser,
} from '../models/types';

export function canViewAllAssignments(user: AuthenticatedUser): boolean {
  return user.role === 'supervisor';
}

export function canManageAssignment(user: AuthenticatedUser): boolean {
  return user.role === 'supervisor' && user.canManageAssignments;
}

export function canUpdateOwnAssignment(
  user: AuthenticatedUser,
  record: AssignmentRecord,
): boolean {
  if (user.role === 'supervisor') return true;
  return user.role === 'analyst' && record.assignment.analystId === user.id;
}

export function visibleAssignmentsFor(
  user: AuthenticatedUser,
  records: AssignmentRecord[],
): AssignmentRecord[] {
  if (canViewAllAssignments(user)) return records;
  return records.filter((record) => record.assignment.analystId === user.id);
}

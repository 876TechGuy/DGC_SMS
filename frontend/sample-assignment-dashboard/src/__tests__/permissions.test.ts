import { describe, expect, it } from 'vitest';
import {
  analystCampbellUser,
  analystReidUser,
  buildAssignmentRecordsFixture,
  readOnlySupervisorUser,
  supervisorUser,
} from '../test/fixtures';
import {
  canManageAssignment,
  canUpdateOwnAssignment,
  canViewAllAssignments,
  visibleAssignmentsFor,
} from '../utils/permissions';

describe('permissions (RBAC)', () => {
  const records = buildAssignmentRecordsFixture();

  it('only supervisors can view all assignments', () => {
    expect(canViewAllAssignments(supervisorUser)).toBe(true);
    expect(canViewAllAssignments(analystReidUser)).toBe(false);
  });

  it('restricts analyst visibility to their own assignments only', () => {
    const visible = visibleAssignmentsFor(analystReidUser, records);
    expect(visible).toHaveLength(1);
    expect(visible.every((record) => record.assignment.analystId === analystReidUser.id)).toBe(true);
  });

  it('gives supervisors visibility into every assignment', () => {
    expect(visibleAssignmentsFor(supervisorUser, records)).toHaveLength(records.length);
  });

  it('an analyst never sees another analyst\'s work', () => {
    const reidVisible = visibleAssignmentsFor(analystReidUser, records);
    const campbellVisible = visibleAssignmentsFor(analystCampbellUser, records);
    const reidIds = new Set(reidVisible.map((record) => record.assignment.id));

    for (const record of campbellVisible) {
      expect(reidIds.has(record.assignment.id)).toBe(false);
    }
  });

  it('only supervisors with manage permission can reassign work', () => {
    expect(canManageAssignment(supervisorUser)).toBe(true);
    expect(canManageAssignment(readOnlySupervisorUser)).toBe(false);
    expect(canManageAssignment(analystReidUser)).toBe(false);
  });

  it('an analyst can only update their own assignment', () => {
    const ownRecord = records.find((record) => record.assignment.analystId === analystReidUser.id)!;
    const othersRecord = records.find((record) => record.assignment.analystId === analystCampbellUser.id)!;

    expect(canUpdateOwnAssignment(analystReidUser, ownRecord)).toBe(true);
    expect(canUpdateOwnAssignment(analystReidUser, othersRecord)).toBe(false);
    expect(canUpdateOwnAssignment(supervisorUser, othersRecord)).toBe(true);
  });
});

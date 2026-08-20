import { describe, expect, it } from 'vitest';
import { buildAssignmentRecords } from '../data/mockData';
import type { AuthenticatedUser } from '../models/types';
import {
  canManageAssignment,
  canUpdateOwnAssignment,
  canViewAllAssignments,
  redactSensitiveFields,
  visibleAssignmentsFor,
} from '../utils/permissions';

const supervisor: AuthenticatedUser = {
  id: 'supervisor-1',
  displayName: 'Supervisor',
  role: 'supervisor',
  canManageAssignments: true,
  canViewSensitiveData: true,
};

const readOnlySupervisor: AuthenticatedUser = {
  ...supervisor,
  id: 'supervisor-2',
  canManageAssignments: false,
};

const analystReid: AuthenticatedUser = {
  id: 'analyst-1',
  displayName: 'A. Reid',
  role: 'analyst',
  canManageAssignments: false,
  canViewSensitiveData: false,
};

const analystCampbell: AuthenticatedUser = {
  id: 'analyst-2',
  displayName: 'B. Campbell',
  role: 'analyst',
  canManageAssignments: false,
  canViewSensitiveData: false,
};

describe('permissions (RBAC)', () => {
  const records = buildAssignmentRecords();

  it('only supervisors can view all assignments', () => {
    expect(canViewAllAssignments(supervisor)).toBe(true);
    expect(canViewAllAssignments(analystReid)).toBe(false);
  });

  it('restricts analyst visibility to their own assignments only', () => {
    const visible = visibleAssignmentsFor(analystReid, records);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every((r) => r.assignment.analystId === 'analyst-1')).toBe(true);
  });

  it('gives supervisors visibility into every assignment', () => {
    const visible = visibleAssignmentsFor(supervisor, records);
    expect(visible).toHaveLength(records.length);
  });

  it('an analyst never sees another analyst\'s work', () => {
    const reidVisible = visibleAssignmentsFor(analystReid, records);
    const campbellVisible = visibleAssignmentsFor(analystCampbell, records);
    const reidIds = new Set(reidVisible.map((r) => r.assignment.id));
    for (const record of campbellVisible) {
      expect(reidIds.has(record.assignment.id)).toBe(false);
    }
  });

  it('only supervisors with manage permission can reassign work', () => {
    expect(canManageAssignment(supervisor)).toBe(true);
    expect(canManageAssignment(readOnlySupervisor)).toBe(false);
    expect(canManageAssignment(analystReid)).toBe(false);
  });

  it('an analyst can only update their own assignment', () => {
    const ownRecord = records.find((r) => r.assignment.analystId === 'analyst-1')!;
    const othersRecord = records.find((r) => r.assignment.analystId === 'analyst-2')!;
    expect(canUpdateOwnAssignment(analystReid, ownRecord)).toBe(true);
    expect(canUpdateOwnAssignment(analystReid, othersRecord)).toBe(false);
    expect(canUpdateOwnAssignment(supervisor, othersRecord)).toBe(true);
  });

  it('redacts subject reference for users without sensitive data permission', () => {
    const record = records[0];
    const redacted = redactSensitiveFields(analystReid, record);
    expect(redacted.sample.patientOrSubjectReference).toBe('Restricted');
    const notRedacted = redactSensitiveFields(supervisor, record);
    expect(notRedacted.sample.patientOrSubjectReference).toBe(
      record.sample.patientOrSubjectReference,
    );
  });
});

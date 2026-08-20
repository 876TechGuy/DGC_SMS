import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetForTesting,
  AssignmentServiceError,
  fetchAssignmentRecords,
  reassignTest,
  updateAssignmentStatus,
} from '../api/assignmentService';
import { clearAuditLogForTesting, getAuditLog } from '../utils/auditLog';

describe('assignmentService', () => {
  beforeEach(() => {
    __resetForTesting();
    clearAuditLogForTesting();
  });

  it('fetches assignment records', async () => {
    const records = await fetchAssignmentRecords();
    expect(records.length).toBeGreaterThan(0);
  });

  it('assigns an unassigned test to an active analyst', async () => {
    const updated = await reassignTest({
      assignmentId: 'assignment-test-2',
      newAnalystId: 'analyst-2',
      performedBy: 'supervisor-1',
      reason: 'Initial assignment',
    });
    expect(updated.assignment.analystId).toBe('analyst-2');
    expect(updated.assignment.status).toBe('Assigned');
    expect(updated.history.at(-1)?.action).toBe('Assigned');
  });

  it('reassigns a test already assigned and requires a reason', async () => {
    await expect(
      reassignTest({
        assignmentId: 'assignment-test-1',
        newAnalystId: 'analyst-2',
        performedBy: 'supervisor-1',
        reason: '   ',
      }),
    ).rejects.toThrow(AssignmentServiceError);

    const updated = await reassignTest({
      assignmentId: 'assignment-test-1',
      newAnalystId: 'analyst-2',
      performedBy: 'supervisor-1',
      reason: 'Workload rebalancing',
    });
    expect(updated.assignment.analystId).toBe('analyst-2');
    expect(updated.assignment.reassignmentReason).toBe('Workload rebalancing');
    expect(updated.history.at(-1)?.action).toBe('Reassigned');
  });

  it('rejects assigning to an inactive analyst', async () => {
    await expect(
      reassignTest({
        assignmentId: 'assignment-test-2',
        newAnalystId: 'analyst-4',
        performedBy: 'supervisor-1',
        reason: 'test',
      }),
    ).rejects.toThrow(/not an active analyst/);
  });

  it('records an audit log entry for reassignment', async () => {
    await reassignTest({
      assignmentId: 'assignment-test-2',
      newAnalystId: 'analyst-2',
      performedBy: 'supervisor-1',
      reason: 'Initial assignment',
    });
    const log = getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].toAnalystId).toBe('analyst-2');
  });

  it('updates assignment status through the workflow', async () => {
    const updated = await updateAssignmentStatus({
      assignmentId: 'assignment-test-6',
      newStatus: 'In Progress',
      performedBy: 'analyst-3',
    });
    expect(updated.assignment.status).toBe('In Progress');
    expect(updated.test.status).toBe('In Progress');
  });

  it('marks a test completed and stamps completedDateTime', async () => {
    const updated = await updateAssignmentStatus({
      assignmentId: 'assignment-test-6',
      newStatus: 'Completed',
      performedBy: 'analyst-3',
    });
    expect(updated.assignment.status).toBe('Completed');
    expect(updated.test.completedDateTime).not.toBeNull();
  });

  it('requires a reason when placing a test on hold', async () => {
    await expect(
      updateAssignmentStatus({
        assignmentId: 'assignment-test-6',
        newStatus: 'On Hold',
        performedBy: 'analyst-3',
      }),
    ).rejects.toThrow(AssignmentServiceError);

    const updated = await updateAssignmentStatus({
      assignmentId: 'assignment-test-6',
      newStatus: 'On Hold',
      performedBy: 'analyst-3',
      blockedReason: 'Reagent shortage',
    });
    expect(updated.test.blockedReason).toBe('Reagent shortage');
  });

  it('rejects operations on an unknown assignment id', async () => {
    await expect(
      updateAssignmentStatus({
        assignmentId: 'does-not-exist',
        newStatus: 'Completed',
        performedBy: 'analyst-3',
      }),
    ).rejects.toThrow(AssignmentServiceError);
  });
});

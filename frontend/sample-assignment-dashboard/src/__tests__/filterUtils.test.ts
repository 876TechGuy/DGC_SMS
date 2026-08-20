import { describe, expect, it } from 'vitest';
import { buildAssignmentRecords } from '../data/mockData';
import {
  applyFilters,
  computeSummary,
  DEFAULT_FILTERS,
  filterByPriority,
  filterByStatus,
  groupByAnalyst,
  searchRecords,
  sortRecords,
} from '../utils/filterUtils';

describe('filterUtils', () => {
  const records = buildAssignmentRecords();

  it('searches across analyst, sample id, test name and status', () => {
    const bySample = searchRecords(records, 'ACC-100001');
    expect(bySample).toHaveLength(1);
    expect(bySample[0].sample.id).toBe('sample-1');

    const byAnalyst = searchRecords(records, 'reid');
    expect(byAnalyst.every((r) => r.analyst?.displayName === 'A. Reid')).toBe(true);

    const byTestName = searchRecords(records, 'dissolution');
    expect(byTestName).toHaveLength(1);
    expect(byTestName[0].test.testName).toBe('Dissolution');
  });

  it('returns all records when search text is empty', () => {
    expect(searchRecords(records, '   ')).toHaveLength(records.length);
  });

  it('filters by status', () => {
    const onHold = filterByStatus(records, 'On Hold');
    expect(onHold.every((r) => r.assignment.status === 'On Hold')).toBe(true);
    expect(filterByStatus(records, 'All')).toHaveLength(records.length);
  });

  it('filters by priority', () => {
    const stat = filterByPriority(records, 'STAT');
    expect(stat.every((r) => r.test.priority === 'STAT')).toBe(true);
  });

  it('applies combined filters', () => {
    const result = applyFilters(records, {
      ...DEFAULT_FILTERS,
      status: 'Escalated',
      priority: 'STAT',
    });
    expect(result.every((r) => r.assignment.status === 'Escalated' && r.test.priority === 'STAT')).toBe(
      true,
    );
  });

  it('sorts by due date ascending and descending', () => {
    const asc = sortRecords(records, 'dueDate', 'asc');
    for (let i = 1; i < asc.length; i += 1) {
      expect(new Date(asc[i - 1].assignment.dueDateTime).getTime()).toBeLessThanOrEqual(
        new Date(asc[i].assignment.dueDateTime).getTime(),
      );
    }
    const desc = sortRecords(records, 'dueDate', 'desc');
    expect(desc[0].assignment.dueDateTime).toBe(asc[asc.length - 1].assignment.dueDateTime);
  });

  it('sorts by priority weight', () => {
    const sorted = sortRecords(records, 'priority', 'desc');
    expect(sorted[0].test.priority).toBe('STAT');
  });

  it('groups records by analyst, falling back to Unassigned', () => {
    const groups = groupByAnalyst(records);
    expect(groups.has('Unassigned')).toBe(true);
    expect(groups.get('A. Reid')?.length).toBeGreaterThan(0);
  });

  it('computes summary counts without exposing per-analyst comparisons', () => {
    const summary = computeSummary(records);
    expect(summary.unassigned).toBe(1);
    expect(summary.overdue).toBeGreaterThanOrEqual(2);
    expect(summary.blocked).toBeGreaterThanOrEqual(1);
    expect(summary.completed).toBe(1);
    // Sanity: the summary object only exposes aggregate keys, not per-analyst data.
    expect(Object.keys(summary).sort()).toEqual(
      ['blocked', 'completed', 'overdue', 'totalAssigned', 'unassigned'].sort(),
    );
  });
});

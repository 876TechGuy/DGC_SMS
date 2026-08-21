import { describe, expect, it } from 'vitest';
import { buildAssignmentRecordsFixture } from '../test/fixtures';
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
  const records = buildAssignmentRecordsFixture();

  it('searches across analyst, sample number, test name, location, status, and priority', () => {
    const bySample = searchRecords(records, 'FOOD-001');
    expect(bySample).toHaveLength(1);
    expect(bySample[0].sample.accessionNumber).toBe('FOOD-001');

    const byAnalyst = searchRecords(records, 'reid');
    expect(byAnalyst.every((record) => record.analyst?.displayName === 'A. Reid')).toBe(true);

    const byLocation = searchRecords(records, 'montego');
    expect(byLocation).toHaveLength(1);
    expect(byLocation[0].sample.location).toBe('Montego Bay');
  });

  it('returns all records when search text is empty', () => {
    expect(searchRecords(records, '   ')).toHaveLength(records.length);
  });

  it('filters by status', () => {
    const completed = filterByStatus(records, 'Completed');
    expect(completed).toHaveLength(1);
    expect(completed.every((record) => record.assignment.status === 'Completed')).toBe(true);
    expect(filterByStatus(records, 'All')).toHaveLength(records.length);
  });

  it('filters by priority', () => {
    const stat = filterByPriority(records, 'STAT');
    expect(stat).toHaveLength(1);
    expect(stat.every((record) => record.assignment.priority === 'STAT')).toBe(true);
  });

  it('applies combined filters', () => {
    const result = applyFilters(records, {
      ...DEFAULT_FILTERS,
      status: 'Rejected',
      priority: 'Routine',
    });
    expect(result).toHaveLength(1);
    expect(result[0].assignment.status).toBe('Rejected');
  });

  it('sorts due dates with null values last', () => {
    const asc = sortRecords(records, 'dueDate', 'asc');
    expect(asc.at(-1)?.assignment.dueDateTime).toBeNull();

    const desc = sortRecords(records, 'dueDate', 'desc');
    expect(desc.at(-1)?.assignment.dueDateTime).toBeNull();
  });

  it('sorts by priority weight', () => {
    const sorted = sortRecords(records, 'priority', 'desc');
    expect(sorted[0].assignment.priority).toBe('STAT');
  });

  it('groups records by analyst, falling back to Unassigned', () => {
    const groups = groupByAnalyst(records);
    expect(groups.has('Unassigned')).toBe(true);
    expect(groups.get('A. Reid')).toHaveLength(1);
  });

  it('computes summary counts for the dashboard cards', () => {
    const summary = computeSummary(records);
    expect(summary).toEqual({
      totalAssigned: 4,
      inProgress: 2,
      overdue: 1,
      completed: 1,
    });
  });
});

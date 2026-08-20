/** Filtering, searching, sorting and summary logic for assignment records. */
import type { AssignmentRecord, AssignmentStatus, TestPriority } from '../models/types';
import { isOverdue, isBlocked } from './dateUtils';

export interface DashboardFilters {
  searchText: string;
  status: AssignmentStatus | 'All';
  priority: TestPriority | 'All';
}

export const DEFAULT_FILTERS: DashboardFilters = {
  searchText: '',
  status: 'All',
  priority: 'All',
};

export type SortField = 'dueDate' | 'priority' | 'sampleAge' | 'status';

const PRIORITY_WEIGHT: Record<TestPriority, number> = {
  STAT: 3,
  Urgent: 2,
  Routine: 1,
};

/** Applies text search across analyst, sample ID, test name, batch, status and priority. */
export function searchRecords(
  records: AssignmentRecord[],
  searchText: string,
): AssignmentRecord[] {
  const query = searchText.trim().toLowerCase();
  if (!query) return records;
  return records.filter((record) => {
    const haystack = [
      record.analyst?.displayName ?? '',
      record.sample.id,
      record.sample.accessionNumber,
      record.test.testName,
      record.sample.location,
      record.assignment.status,
      record.test.priority,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function filterByStatus(
  records: AssignmentRecord[],
  status: AssignmentStatus | 'All',
): AssignmentRecord[] {
  if (status === 'All') return records;
  return records.filter((record) => record.assignment.status === status);
}

export function filterByPriority(
  records: AssignmentRecord[],
  priority: TestPriority | 'All',
): AssignmentRecord[] {
  if (priority === 'All') return records;
  return records.filter((record) => record.test.priority === priority);
}

/** Applies the full filter set (search + status + priority) in one pass. */
export function applyFilters(
  records: AssignmentRecord[],
  filters: DashboardFilters,
): AssignmentRecord[] {
  let result = records;
  result = searchRecords(result, filters.searchText);
  result = filterByStatus(result, filters.status);
  result = filterByPriority(result, filters.priority);
  return result;
}

export function sortRecords(
  records: AssignmentRecord[],
  field: SortField,
  direction: 'asc' | 'desc' = 'asc',
): AssignmentRecord[] {
  const sorted = [...records].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case 'dueDate':
        cmp =
          new Date(a.assignment.dueDateTime).getTime() -
          new Date(b.assignment.dueDateTime).getTime();
        break;
      case 'priority':
        cmp = PRIORITY_WEIGHT[a.test.priority] - PRIORITY_WEIGHT[b.test.priority];
        break;
      case 'sampleAge':
        cmp =
          new Date(a.sample.receivedDateTime).getTime() -
          new Date(b.sample.receivedDateTime).getTime();
        break;
      case 'status':
        cmp = a.assignment.status.localeCompare(b.assignment.status);
        break;
      default:
        cmp = 0;
    }
    return direction === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

/** Groups records by analyst display name (falling back to "Unassigned"). */
export function groupByAnalyst(
  records: AssignmentRecord[],
): Map<string, AssignmentRecord[]> {
  const groups = new Map<string, AssignmentRecord[]>();
  for (const record of records) {
    const key = record.analyst?.displayName ?? 'Unassigned';
    const existing = groups.get(key);
    if (existing) {
      existing.push(record);
    } else {
      groups.set(key, [record]);
    }
  }
  return groups;
}

export interface DashboardSummary {
  totalAssigned: number;
  unassigned: number;
  overdue: number;
  blocked: number;
  completed: number;
}

/**
 * Computes the top-row summary counts.
 *
 * These counts describe workload volume only - they are NOT a measure of
 * individual employee performance and must not be used for that purpose
 * (e.g. do not rank or compare analysts using these numbers).
 */
export function computeSummary(records: AssignmentRecord[]): DashboardSummary {
  return records.reduce<DashboardSummary>(
    (summary, record) => {
      const { assignment, test } = record;
      const overdue = isOverdue(assignment.dueDateTime, test.completedDateTime);
      const blocked = isBlocked(assignment.status, test.blockedReason);
      return {
        totalAssigned: summary.totalAssigned + (assignment.status !== 'Unassigned' ? 1 : 0),
        unassigned: summary.unassigned + (assignment.status === 'Unassigned' ? 1 : 0),
        overdue: summary.overdue + (overdue ? 1 : 0),
        blocked: summary.blocked + (blocked ? 1 : 0),
        completed: summary.completed + (assignment.status === 'Completed' ? 1 : 0),
      };
    },
    { totalAssigned: 0, unassigned: 0, overdue: 0, blocked: 0, completed: 0 },
  );
}

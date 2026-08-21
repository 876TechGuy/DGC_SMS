import type { AssignmentRecord, AssignmentStatus, TestPriority } from '../models/types';

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

const COMPLETED_STATUSES: AssignmentStatus[] = ['Accepted', 'Completed'];

function compareOptionalDate(
  a: string | null,
  b: string | null,
  direction: 'asc' | 'desc',
): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const aTime = new Date(a).getTime();
  const bTime = new Date(b).getTime();

  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;

  const difference = aTime - bTime;
  return direction === 'asc' ? difference : -difference;
}

export function searchRecords(
  records: AssignmentRecord[],
  searchText: string,
): AssignmentRecord[] {
  const query = searchText.trim().toLowerCase();
  if (!query) return records;

  return records.filter((record) => {
    const haystack = [
      record.analyst?.displayName ?? '',
      record.sample.accessionNumber,
      record.sample.location ?? '',
      record.test.testName,
      record.assignment.status,
      record.assignment.priority,
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
  return records.filter((record) => record.assignment.priority === priority);
}

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
    let comparison = 0;

    switch (field) {
      case 'dueDate':
        comparison = compareOptionalDate(
          a.assignment.dueDateTime,
          b.assignment.dueDateTime,
          direction,
        );
        break;
      case 'priority':
        comparison = PRIORITY_WEIGHT[a.assignment.priority] - PRIORITY_WEIGHT[b.assignment.priority];
        break;
      case 'sampleAge':
        comparison = compareOptionalDate(
          a.sample.receivedDateTime,
          b.sample.receivedDateTime,
          direction,
        );
        break;
      case 'status':
        comparison = a.assignment.status.localeCompare(b.assignment.status);
        break;
      default:
        comparison = 0;
    }
    return field === 'priority' || field === 'status'
      ? direction === 'asc'
        ? comparison
        : -comparison
      : comparison;
  });

  return sorted;
}

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
  inProgress: number;
  overdue: number;
  completed: number;
}

export function computeSummary(records: AssignmentRecord[]): DashboardSummary {
  return records.reduce<DashboardSummary>(
    (summary, record) => ({
      totalAssigned: summary.totalAssigned + 1,
      inProgress:
        summary.inProgress +
        (COMPLETED_STATUSES.includes(record.assignment.status) || record.assignment.status === 'Rejected'
          ? 0
          : 1),
      overdue: summary.overdue + (record.assignment.overdue ? 1 : 0),
      completed:
        summary.completed + (COMPLETED_STATUSES.includes(record.assignment.status) ? 1 : 0),
    }),
    { totalAssigned: 0, inProgress: 0, overdue: 0, completed: 0 },
  );
}

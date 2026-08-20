import type { AssignmentStatus } from '../models/types';

const STATUS_CLASS: Record<AssignmentStatus, string> = {
  Unassigned: 'badge badge--neutral',
  Assigned: 'badge badge--info',
  'In Progress': 'badge badge--progress',
  Completed: 'badge badge--success',
  'On Hold': 'badge badge--hold',
  Escalated: 'badge badge--danger',
};

export function StatusBadge({ status }: { status: AssignmentStatus }) {
  return (
    <span className={STATUS_CLASS[status]} role="status">
      {status}
    </span>
  );
}

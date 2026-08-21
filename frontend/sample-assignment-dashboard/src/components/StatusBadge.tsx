import type { AssignmentStatus } from '../models/types';

const STATUS_CLASS: Record<AssignmentStatus, string> = {
  Assigned: 'badge badge--info',
  'In Progress': 'badge badge--progress',
  'Report Submitted': 'badge badge--progress',
  'Preliminary Review': 'badge badge--neutral',
  'Senior Chemist Review': 'badge badge--neutral',
  'Returned for Correction': 'badge badge--warning',
  Accepted: 'badge badge--success',
  Rejected: 'badge badge--danger',
  Completed: 'badge badge--success',
};

export function StatusBadge({ status }: { status: AssignmentStatus }) {
  return (
    <span className={STATUS_CLASS[status]} role="status">
      {status}
    </span>
  );
}

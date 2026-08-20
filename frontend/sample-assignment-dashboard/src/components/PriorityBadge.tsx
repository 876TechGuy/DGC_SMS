import type { TestPriority } from '../models/types';

const PRIORITY_CLASS: Record<TestPriority, string> = {
  Routine: 'badge badge--neutral',
  Urgent: 'badge badge--warning',
  STAT: 'badge badge--danger',
};

export function PriorityBadge({ priority }: { priority: TestPriority }) {
  return (
    <span className={PRIORITY_CLASS[priority]} role="status">
      {priority}
    </span>
  );
}

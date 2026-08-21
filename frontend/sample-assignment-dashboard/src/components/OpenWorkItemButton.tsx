import type { AssignmentRecord } from '../models/types';

export function OpenWorkItemButton({ record }: { record: AssignmentRecord }) {
  return (
    <a className="assignment-actions__link" href={record.test.workItemUrl}>
      Open work item →
    </a>
  );
}

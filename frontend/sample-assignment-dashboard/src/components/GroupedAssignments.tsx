import type { AssignmentRecord, AuthenticatedUser } from '../models/types';
import { groupByAnalyst } from '../utils/filterUtils';
import { AssignmentTable } from './AssignmentTable';

interface GroupedAssignmentsProps {
  currentUser: AuthenticatedUser;
  records: AssignmentRecord[];
  onReassign: (record: AssignmentRecord) => void;
}

export function GroupedAssignments({
  currentUser,
  records,
  onReassign,
}: GroupedAssignmentsProps) {
  const groups = groupByAnalyst(records);

  return (
    <div className="grouped-assignments">
      {Array.from(groups.entries()).map(([analystName, groupRecords]) => (
        <section key={analystName} className="grouped-assignments__group" aria-label={analystName}>
          <div className="grouped-assignments__heading">
            <h3>{analystName}</h3>
            <span className="grouped-assignments__count">{groupRecords.length} items</span>
          </div>
          <AssignmentTable
            currentUser={currentUser}
            records={groupRecords}
            onReassign={onReassign}
          />
        </section>
      ))}
    </div>
  );
}

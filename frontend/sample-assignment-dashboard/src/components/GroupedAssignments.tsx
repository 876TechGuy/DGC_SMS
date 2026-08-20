import type { AssignmentRecord, AssignmentStatus, AuthenticatedUser } from '../models/types';
import { groupByAnalyst } from '../utils/filterUtils';
import { AssignmentTable } from './AssignmentTable';

interface GroupedAssignmentsProps {
  currentUser: AuthenticatedUser;
  records: AssignmentRecord[];
  onReassign: (record: AssignmentRecord) => void;
  onUpdateStatus: (record: AssignmentRecord, status: AssignmentStatus, blockedReason?: string) => void;
}

/** Groups supervisor-view records by analyst, each with its own labelled section. */
export function GroupedAssignments({
  currentUser,
  records,
  onReassign,
  onUpdateStatus,
}: GroupedAssignmentsProps) {
  const groups = groupByAnalyst(records);

  return (
    <div className="grouped-assignments">
      {Array.from(groups.entries()).map(([analystName, groupRecords]) => (
        <section key={analystName} className="grouped-assignments__group" aria-label={analystName}>
          <h3>
            {analystName}{' '}
            <span className="grouped-assignments__count">({groupRecords.length})</span>
          </h3>
          <AssignmentTable
            currentUser={currentUser}
            records={groupRecords}
            onReassign={onReassign}
            onUpdateStatus={onUpdateStatus}
          />
        </section>
      ))}
    </div>
  );
}

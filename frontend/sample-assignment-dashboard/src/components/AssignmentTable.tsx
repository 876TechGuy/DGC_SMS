import { Fragment, useState } from 'react';
import type { AssignmentRecord, AssignmentStatus, AuthenticatedUser } from '../models/types';
import { formatDateTime, isOverdue, isBlocked } from '../utils/dateUtils';
import { canManageAssignment, canUpdateOwnAssignment } from '../utils/permissions';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { AssignmentDetails } from './AssignmentDetails';
import { StatusActions } from './StatusActions';

interface AssignmentTableProps {
  currentUser: AuthenticatedUser;
  records: AssignmentRecord[];
  onReassign: (record: AssignmentRecord) => void;
  onUpdateStatus: (record: AssignmentRecord, status: AssignmentStatus, blockedReason?: string) => void;
}

function rowIndicatorClass(record: AssignmentRecord): string {
  const overdue = isOverdue(record.assignment.dueDateTime, record.test.completedDateTime);
  const blocked = isBlocked(record.assignment.status, record.test.blockedReason);
  if (overdue) return 'assignment-row--overdue';
  if (blocked) return 'assignment-row--blocked';
  return '';
}

function Indicators({ record }: { record: AssignmentRecord }) {
  const overdue = isOverdue(record.assignment.dueDateTime, record.test.completedDateTime);
  const blocked = isBlocked(record.assignment.status, record.test.blockedReason);
  if (!overdue && !blocked) return null;
  return (
    <span className="assignment-indicators">
      {overdue && (
        <span className="assignment-indicators__flag assignment-indicators__flag--overdue">
          Overdue
        </span>
      )}
      {blocked && (
        <span className="assignment-indicators__flag assignment-indicators__flag--blocked">
          Blocked
        </span>
      )}
    </span>
  );
}

export function AssignmentTable({
  currentUser,
  records,
  onReassign,
  onUpdateStatus,
}: AssignmentTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isSupervisor = currentUser.role === 'supervisor';

  const toggleExpanded = (id: string) =>
    setExpandedId((current) => (current === id ? null : id));

  return (
    <>
      {/* Desktop table - hidden on narrow viewports via CSS. */}
      <table className="assignment-table assignment-table--desktop">
        <caption className="sr-only">
          {isSupervisor ? 'All analyst assignments' : 'Your assigned samples and tests'}
        </caption>
        <thead>
          <tr>
            {isSupervisor && <th scope="col">Analyst</th>}
            <th scope="col">Sample ID</th>
            <th scope="col">Test</th>
            <th scope="col">Status</th>
            <th scope="col">Priority</th>
            <th scope="col">Due date</th>
            {isSupervisor ? (
              <th scope="col">Assigned date</th>
            ) : (
              <th scope="col">Instructions</th>
            )}
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const canManage = canManageAssignment(currentUser);
            const canUpdate = canUpdateOwnAssignment(currentUser, record);
            const expanded = expandedId === record.assignment.id;
            return (
              <Fragment key={record.assignment.id}>
                <tr className={rowIndicatorClass(record)}>
                  {isSupervisor && <td>{record.analyst?.displayName ?? 'Unassigned'}</td>}
                  <td>
                    <button
                      type="button"
                      className="assignment-table__expand-toggle"
                      aria-expanded={expanded}
                      onClick={() => toggleExpanded(record.assignment.id)}
                    >
                      {record.sample.accessionNumber}
                    </button>
                  </td>
                  <td>{record.test.testName}</td>
                  <td>
                    <StatusBadge status={record.assignment.status} />
                    <Indicators record={record} />
                  </td>
                  <td>
                    <PriorityBadge priority={record.test.priority} />
                  </td>
                  <td>{formatDateTime(record.assignment.dueDateTime)}</td>
                  {isSupervisor ? (
                    <td>{formatDateTime(record.assignment.assignedDateTime)}</td>
                  ) : (
                    <td className="assignment-table__instructions">
                      {record.test.instructions}
                    </td>
                  )}
                  <td>
                    <div className="assignment-actions">
                      {canManage && (
                        <button type="button" onClick={() => onReassign(record)}>
                          {record.analyst ? 'Reassign' : 'Assign'}
                        </button>
                      )}
                      {!isSupervisor && canUpdate && (
                        <StatusActions
                          record={record}
                          onUpdateStatus={(status, reason) =>
                            onUpdateStatus(record, status, reason)
                          }
                        />
                      )}
                    </div>
                  </td>
                </tr>
                {expanded && (
                  <tr className="assignment-table__detail-row">
                    <td colSpan={isSupervisor ? 8 : 7}>
                      <AssignmentDetails record={record} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Mobile cards - hidden on wide viewports via CSS. */}
      <ul className="assignment-cards assignment-table--mobile">
        {records.map((record) => {
          const canManage = canManageAssignment(currentUser);
          const canUpdate = canUpdateOwnAssignment(currentUser, record);
          const expanded = expandedId === record.assignment.id;
          return (
            <li
              key={record.assignment.id}
              className={`assignment-card ${rowIndicatorClass(record)}`}
            >
              <div className="assignment-card__header">
                <span className="assignment-card__sample">{record.sample.accessionNumber}</span>
                <StatusBadge status={record.assignment.status} />
              </div>
              <p className="assignment-card__test">{record.test.testName}</p>
              {isSupervisor && (
                <p className="assignment-card__analyst">
                  Analyst: {record.analyst?.displayName ?? 'Unassigned'}
                </p>
              )}
              <p>
                <PriorityBadge priority={record.test.priority} /> · Due{' '}
                {formatDateTime(record.assignment.dueDateTime)}
              </p>
              <Indicators record={record} />
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => toggleExpanded(record.assignment.id)}
              >
                {expanded ? 'Hide details' : 'View details'}
              </button>
              {expanded && <AssignmentDetails record={record} />}
              <div className="assignment-actions">
                {canManage && (
                  <button type="button" onClick={() => onReassign(record)}>
                    {record.analyst ? 'Reassign' : 'Assign'}
                  </button>
                )}
                {!isSupervisor && canUpdate && (
                  <StatusActions
                    record={record}
                    onUpdateStatus={(status, reason) => onUpdateStatus(record, status, reason)}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

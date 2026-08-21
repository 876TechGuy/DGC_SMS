import { Fragment, useState } from 'react';
import type { AssignmentRecord, AuthenticatedUser } from '../models/types';
import { formatDateTime } from '../utils/dateUtils';
import { canManageAssignment } from '../utils/permissions';
import { AssignmentDetails } from './AssignmentDetails';
import { OpenWorkItemButton } from './OpenWorkItemButton';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';

interface AssignmentTableProps {
  currentUser: AuthenticatedUser;
  records: AssignmentRecord[];
  onReassign: (record: AssignmentRecord) => void;
}

function rowIndicatorClass(record: AssignmentRecord): string {
  return record.assignment.overdue ? 'assignment-row--overdue' : '';
}

function Indicators({ record }: { record: AssignmentRecord }) {
  if (!record.assignment.overdue) return null;

  return (
    <span className="assignment-indicators">
      <span className="assignment-indicators__flag assignment-indicators__flag--overdue">
        Overdue
      </span>
    </span>
  );
}

export function AssignmentTable({
  currentUser,
  records,
  onReassign,
}: AssignmentTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isSupervisor = currentUser.role === 'supervisor';
  const columnCount = isSupervisor ? 7 : 6;

  const toggleExpanded = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <>
      <div className="assignment-table-shell assignment-table--desktop">
        <table className="assignment-table">
          <caption className="sr-only">
            {isSupervisor ? 'All analyst assignments' : 'Your assigned samples and tests'}
          </caption>
          <thead>
            <tr>
              {isSupervisor && <th scope="col">Analyst</th>}
              <th scope="col">Sample number</th>
              <th scope="col">Test name</th>
              <th scope="col">Priority</th>
              <th scope="col">Due date</th>
              <th scope="col">Current status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const canManage = canManageAssignment(currentUser);
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
                    <td>
                      <div className="assignment-table__primary">{record.test.testName}</div>
                      <div className="assignment-table__secondary">{record.sample.sampleName}</div>
                    </td>
                    <td>
                      <PriorityBadge priority={record.assignment.priority} />
                    </td>
                    <td>{formatDateTime(record.assignment.dueDateTime)}</td>
                    <td>
                      <StatusBadge status={record.assignment.status} />
                      <Indicators record={record} />
                    </td>
                    <td>
                      <div className="assignment-actions">
                        <OpenWorkItemButton record={record} />
                        {canManage && (
                          <button type="button" onClick={() => onReassign(record)}>
                            {record.analyst ? 'Reassign' : 'Assign'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="assignment-table__detail-row">
                      <td colSpan={columnCount}>
                        <AssignmentDetails record={record} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="assignment-cards assignment-table--mobile">
        {records.map((record) => {
          const canManage = canManageAssignment(currentUser);
          const expanded = expandedId === record.assignment.id;

          return (
            <li
              key={record.assignment.id}
              className={`assignment-card ${rowIndicatorClass(record)}`.trim()}
            >
              <div className="assignment-card__header">
                <span className="assignment-card__sample">{record.sample.accessionNumber}</span>
                <StatusBadge status={record.assignment.status} />
              </div>
              <p className="assignment-card__test">{record.test.testName}</p>
              <p className="assignment-card__meta">{record.sample.sampleName}</p>
              {isSupervisor && (
                <p className="assignment-card__analyst">
                  Analyst: {record.analyst?.displayName ?? 'Unassigned'}
                </p>
              )}
              <p className="assignment-card__meta">
                <PriorityBadge priority={record.assignment.priority} />
                <span>Due {formatDateTime(record.assignment.dueDateTime)}</span>
              </p>
              <Indicators record={record} />
              <div className="assignment-actions">
                <OpenWorkItemButton record={record} />
                {canManage && (
                  <button type="button" onClick={() => onReassign(record)}>
                    {record.analyst ? 'Reassign' : 'Assign'}
                  </button>
                )}
                <button
                  type="button"
                  className="assignment-card__details-toggle"
                  aria-expanded={expanded}
                  onClick={() => toggleExpanded(record.assignment.id)}
                >
                  {expanded ? 'Hide details' : 'View details'}
                </button>
              </div>
              {expanded && <AssignmentDetails record={record} />}
            </li>
          );
        })}
      </ul>
    </>
  );
}

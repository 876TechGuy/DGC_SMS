import { useState } from 'react';
import type { AssignmentRecord, AuthenticatedUser } from '../models/types';
import { useAssignmentDashboard } from '../state/useAssignmentDashboard';
import { computeSummary } from '../utils/filterUtils';
import { canManageAssignment } from '../utils/permissions';
import { SummaryCounts } from './SummaryCounts';
import { FilterBar } from './FilterBar';
import { SortControl } from './SortControl';
import { AssignmentTable } from './AssignmentTable';
import { GroupedAssignments } from './GroupedAssignments';
import { ReassignModal } from './ReassignModal';
import { LoadingState } from './states/LoadingState';
import { EmptyState } from './states/EmptyState';
import { ErrorState } from './states/ErrorState';
import { NoPermissionState } from './states/NoPermissionState';
import '../styles/dashboard.css';

export interface SampleAssignmentDashboardProps {
  currentUser: AuthenticatedUser;
}

export function SampleAssignmentDashboard({ currentUser }: SampleAssignmentDashboardProps) {
  const hasRecognizedRole =
    currentUser.role === 'supervisor' || currentUser.role === 'analyst';
  const {
    loadStatus,
    errorMessage,
    analysts,
    filters,
    setFilters,
    resetFilters,
    sortField,
    sortDirection,
    setSortField,
    setSortDirection,
    records,
    reload,
    reassign,
    actionError,
    setActionError,
  } = useAssignmentDashboard(currentUser, hasRecognizedRole);

  const [groupByAnalystView, setGroupByAnalystView] = useState(true);
  const [reassignTarget, setReassignTarget] = useState<AssignmentRecord | null>(null);

  if (!hasRecognizedRole) {
    return <NoPermissionState />;
  }

  const isSupervisor = currentUser.role === 'supervisor';
  const summary = computeSummary(records);

  const handleReassignConfirm = async (newAnalystId: string, reason: string) => {
    if (!reassignTarget) return;
    const ok = await reassign(reassignTarget.assignment.id, newAnalystId, reason);
    if (ok) setReassignTarget(null);
  };

  return (
    <div className="sample-assignment-dashboard" aria-label="Sample and test assignment dashboard">
      <header className="sample-assignment-dashboard__header">
        <div>
          <p className="sample-assignment-dashboard__eyebrow">Assignment operations</p>
          <h2>{isSupervisor ? 'Team assignments' : 'My assignments'}</h2>
          <p className="sample-assignment-dashboard__subtitle">
            Track current workload, open source work items, and rebalance assignments when needed.
          </p>
        </div>
      </header>

      {loadStatus === 'loading' && <LoadingState />}
      {loadStatus === 'error' && (
        <ErrorState message={errorMessage ?? 'Something went wrong.'} onRetry={reload} />
      )}

      {loadStatus === 'ready' && (
        <>
          <SummaryCounts summary={summary} />

          <div className="sample-assignment-dashboard__toolbar">
            <FilterBar filters={filters} onChange={setFilters} onReset={resetFilters} />
            <div className="sample-assignment-dashboard__controls">
              {isSupervisor && (
                <label className="sample-assignment-dashboard__group-toggle">
                  <input
                    type="checkbox"
                    checked={groupByAnalystView}
                    onChange={(e) => setGroupByAnalystView(e.target.checked)}
                  />
                  <span>Group by analyst</span>
                </label>
              )}
              <SortControl
                sortField={sortField}
                sortDirection={sortDirection}
                onChange={(field, direction) => {
                  setSortField(field);
                  setSortDirection(direction);
                }}
              />
            </div>
          </div>

          {actionError && (
            <p role="alert" className="sample-assignment-dashboard__action-error">
              <span>{actionError}</span>
              <button type="button" onClick={() => setActionError(null)}>
                Dismiss
              </button>
            </p>
          )}

          {records.length === 0 ? (
            <EmptyState />
          ) : isSupervisor && groupByAnalystView ? (
            <GroupedAssignments
              currentUser={currentUser}
              records={records}
              onReassign={setReassignTarget}
            />
          ) : (
            <AssignmentTable
              currentUser={currentUser}
              records={records}
              onReassign={setReassignTarget}
            />
          )}

          {reassignTarget && canManageAssignment(currentUser) && (
            <ReassignModal
              record={reassignTarget}
              analysts={analysts}
              onConfirm={handleReassignConfirm}
              onCancel={() => setReassignTarget(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

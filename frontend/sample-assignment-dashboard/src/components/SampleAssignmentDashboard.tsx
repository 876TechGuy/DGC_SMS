/**
 * SampleAssignmentDashboard - the main embeddable widget.
 *
 * Renders a supervisor view (all analysts' assignments, grouped by
 * analyst, with reassignment/assignment controls) or an analyst view
 * (only that analyst's own work, with status update controls),
 * depending on `currentUser.role`.
 */
import { useState } from 'react';
import type { AssignmentRecord, AssignmentStatus, AuthenticatedUser } from '../models/types';
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
    updateStatus,
    actionError,
    setActionError,
  } = useAssignmentDashboard(currentUser);

  const [groupByAnalystView, setGroupByAnalystView] = useState(true);
  const [reassignTarget, setReassignTarget] = useState<AssignmentRecord | null>(null);

  // AUTHZ CHECK: block rendering entirely for roles not recognised by the
  // widget. A real integration should perform this check server-side too.
  if (currentUser.role !== 'supervisor' && currentUser.role !== 'analyst') {
    return <NoPermissionState />;
  }

  const isSupervisor = currentUser.role === 'supervisor';
  const summary = computeSummary(records);

  const handleUpdateStatus = async (
    record: AssignmentRecord,
    status: AssignmentStatus,
    blockedReason?: string,
  ) => {
    await updateStatus(record.assignment.id, status, blockedReason);
  };

  const handleReassignConfirm = async (newAnalystId: string, reason: string) => {
    if (!reassignTarget) return;
    const ok = await reassign(reassignTarget.assignment.id, newAnalystId, reason);
    if (ok) setReassignTarget(null);
  };

  return (
    <div className="sample-assignment-dashboard" aria-label="Sample and test assignment dashboard">
      <header className="sample-assignment-dashboard__header">
        <h2>{isSupervisor ? 'Team assignments' : 'My assignments'}</h2>
      </header>

      {loadStatus === 'loading' && <LoadingState />}
      {loadStatus === 'error' && (
        <ErrorState message={errorMessage ?? 'Something went wrong.'} onRetry={reload} />
      )}

      {loadStatus === 'ready' && (
        <>
          <SummaryCounts summary={summary} />

          <FilterBar filters={filters} onChange={setFilters} onReset={resetFilters} />

          {actionError && (
            <p role="alert" className="sample-assignment-dashboard__action-error">
              {actionError}
              <button type="button" onClick={() => setActionError(null)}>
                Dismiss
              </button>
            </p>
          )}

          <div className="sample-assignment-dashboard__controls">
            {isSupervisor && (
              <label className="sample-assignment-dashboard__group-toggle">
                <input
                  type="checkbox"
                  checked={groupByAnalystView}
                  onChange={(e) => setGroupByAnalystView(e.target.checked)}
                />
                Group by analyst
              </label>
            )}
            {!isSupervisor && (
              <SortControl
                sortField={sortField}
                sortDirection={sortDirection}
                onChange={(field, direction) => {
                  setSortField(field);
                  setSortDirection(direction);
                }}
              />
            )}
          </div>

          {records.length === 0 ? (
            <EmptyState />
          ) : isSupervisor && groupByAnalystView ? (
            <GroupedAssignments
              currentUser={currentUser}
              records={records}
              onReassign={setReassignTarget}
              onUpdateStatus={handleUpdateStatus}
            />
          ) : (
            <AssignmentTable
              currentUser={currentUser}
              records={records}
              onReassign={setReassignTarget}
              onUpdateStatus={handleUpdateStatus}
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

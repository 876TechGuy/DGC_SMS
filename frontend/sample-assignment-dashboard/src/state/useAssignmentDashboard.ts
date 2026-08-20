/**
 * Central state hook for the dashboard widget. Encapsulates data fetching,
 * loading/error state, filters, sorting, and assignment mutations so that
 * presentational components stay simple and testable.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAnalysts,
  fetchAssignmentRecords,
  reassignTest,
  updateAssignmentStatus,
} from '../api/assignmentService';
import type {
  Analyst,
  AssignmentRecord,
  AssignmentStatus,
  AuthenticatedUser,
} from '../models/types';
import {
  applyFilters,
  DEFAULT_FILTERS,
  sortRecords,
  type DashboardFilters,
  type SortField,
} from '../utils/filterUtils';
import { redactSensitiveFields, visibleAssignmentsFor } from '../utils/permissions';

export type LoadStatus = 'loading' | 'error' | 'ready';

export function useAssignmentDashboard(currentUser: AuthenticatedUser) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [allRecords, setAllRecords] = useState<AssignmentRecord[]>([]);
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadStatus('loading');
    setErrorMessage(null);
    try {
      const [records, analystList] = await Promise.all([
        fetchAssignmentRecords(),
        fetchAnalysts(),
      ]);
      setAllRecords(records);
      setAnalysts(analystList);
      setLoadStatus('ready');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to load assignment data.',
      );
      setLoadStatus('error');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Row-level RBAC: analysts only ever receive their own records here.
  const visibleRecords = useMemo(
    () =>
      visibleAssignmentsFor(currentUser, allRecords).map((record) =>
        redactSensitiveFields(currentUser, record),
      ),
    [currentUser, allRecords],
  );

  const filteredRecords = useMemo(
    () => applyFilters(visibleRecords, filters),
    [visibleRecords, filters],
  );

  const sortedRecords = useMemo(
    () => sortRecords(filteredRecords, sortField, sortDirection),
    [filteredRecords, sortField, sortDirection],
  );

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const reassign = useCallback(
    async (assignmentId: string, newAnalystId: string, reason: string) => {
      setActionError(null);
      try {
        const updated = await reassignTest({
          assignmentId,
          newAnalystId,
          performedBy: currentUser.id,
          reason,
        });
        setAllRecords((prev) =>
          prev.map((r) => (r.assignment.id === assignmentId ? updated : r)),
        );
        return true;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Reassignment failed.');
        return false;
      }
    },
    [currentUser.id],
  );

  const updateStatus = useCallback(
    async (
      assignmentId: string,
      newStatus: AssignmentStatus,
      blockedReason?: string | null,
    ) => {
      setActionError(null);
      try {
        const updated = await updateAssignmentStatus({
          assignmentId,
          newStatus,
          performedBy: currentUser.id,
          blockedReason,
        });
        setAllRecords((prev) =>
          prev.map((r) => (r.assignment.id === assignmentId ? updated : r)),
        );
        return true;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Status update failed.');
        return false;
      }
    },
    [currentUser.id],
  );

  return {
    loadStatus,
    errorMessage,
    analysts,
    filters,
    setFilters,
    resetFilters,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    records: sortedRecords,
    reload: loadData,
    reassign,
    updateStatus,
    actionError,
    setActionError,
  };
}

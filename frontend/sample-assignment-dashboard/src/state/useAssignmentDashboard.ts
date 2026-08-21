import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAnalysts,
  fetchAssignmentRecords,
  reassignTest,
} from '../api/assignmentService';
import type {
  Analyst,
  AssignmentRecord,
  AuthenticatedUser,
} from '../models/types';
import {
  applyFilters,
  DEFAULT_FILTERS,
  sortRecords,
  type DashboardFilters,
  type SortField,
} from '../utils/filterUtils';
import { visibleAssignmentsFor } from '../utils/permissions';

export type LoadStatus = 'loading' | 'error' | 'ready';

export function useAssignmentDashboard(currentUser: AuthenticatedUser, enabled = true) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [allRecords, setAllRecords] = useState<AssignmentRecord[]>([]);
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async (isInitialLoad = false) => {
    if (!isInitialLoad) {
      setLoadStatus('loading');
      setErrorMessage(null);
    }
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
    if (!enabled) return;
    // oxlint-disable-next-line react/set-state-in-effect
    void loadData(true);
  }, [enabled, loadData]);

  const visibleRecords = useMemo(
    () => visibleAssignmentsFor(currentUser, allRecords),
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

  const reassign = useCallback(async (assignmentId: string, newAnalystId: string, reason: string) => {
    setActionError(null);
    try {
      const updated = await reassignTest({
        assignmentId,
        newAnalystId,
        reason,
      });
      setAllRecords((prev) =>
        prev.map((record) => (record.assignment.id === assignmentId ? updated : record)),
      );
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Reassignment failed.');
      return false;
    }
  }, []);

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
    actionError,
    setActionError,
  };
}

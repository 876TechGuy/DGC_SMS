import type { ChangeEvent } from 'react';
import { ALL_PRIORITIES, ALL_STATUSES } from '../models/types';
import type { DashboardFilters } from '../utils/filterUtils';

interface FilterBarProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  onReset: () => void;
}

export function FilterBar({ filters, onChange, onReset }: FilterBarProps) {
  const handleSearch = (e: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...filters, searchText: e.target.value });
  const handleStatus = (e: ChangeEvent<HTMLSelectElement>) =>
    onChange({ ...filters, status: e.target.value as DashboardFilters['status'] });
  const handlePriority = (e: ChangeEvent<HTMLSelectElement>) =>
    onChange({ ...filters, priority: e.target.value as DashboardFilters['priority'] });

  return (
    <div className="filter-bar" role="search">
      <label className="filter-bar__field">
        <span>Search</span>
        <input
          type="text"
          value={filters.searchText}
          onChange={handleSearch}
          placeholder="Analyst, sample ID, test, batch, status, priority"
          aria-label="Search analyst, sample ID, test name, batch, status, or priority"
        />
      </label>
      <label className="filter-bar__field">
        <span>Status</span>
        <select value={filters.status} onChange={handleStatus} aria-label="Filter by status">
          <option value="All">All statuses</option>
          {ALL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-bar__field">
        <span>Priority</span>
        <select value={filters.priority} onChange={handlePriority} aria-label="Filter by priority">
          <option value="All">All priorities</option>
          {ALL_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="filter-bar__reset" onClick={onReset}>
        Reset filters
      </button>
    </div>
  );
}

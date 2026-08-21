import type { SortField } from '../utils/filterUtils';

interface SortControlProps {
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onChange: (field: SortField, direction: 'asc' | 'desc') => void;
}

const OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'sampleAge', label: 'Received date' },
  { value: 'status', label: 'Status' },
];

export function SortControl({ sortField, sortDirection, onChange }: SortControlProps) {
  return (
    <div className="sort-control">
      <label>
        <span>Sort by</span>
        <select
          value={sortField}
          onChange={(e) => onChange(e.target.value as SortField, sortDirection)}
          aria-label="Sort assignments by"
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => onChange(sortField, sortDirection === 'asc' ? 'desc' : 'asc')}
        aria-label={`Sort direction: ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
      >
        {sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending'}
      </button>
    </div>
  );
}

import type { SortField } from '../utils/filterUtils';

interface SortControlProps {
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onChange: (field: SortField, direction: 'asc' | 'desc') => void;
}

const OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'sampleAge', label: 'Sample age' },
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
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
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

import type { DashboardSummary } from '../utils/filterUtils';

interface SummaryCountsProps {
  summary: DashboardSummary;
}

/**
 * Top-row summary counts. These reflect workload volume only and must
 * never be presented or used as an employee performance rating.
 */
export function SummaryCounts({ summary }: SummaryCountsProps) {
  const items: Array<{ label: string; value: number; tone?: string }> = [
    { label: 'Total assigned', value: summary.totalAssigned },
    { label: 'Unassigned', value: summary.unassigned },
    { label: 'Overdue', value: summary.overdue, tone: 'danger' },
    { label: 'Blocked', value: summary.blocked, tone: 'warning' },
    { label: 'Completed', value: summary.completed, tone: 'success' },
  ];

  return (
    <dl className="summary-counts" aria-label="Assignment summary counts">
      {items.map((item) => (
        <div
          key={item.label}
          className={`summary-counts__item${item.tone ? ` summary-counts__item--${item.tone}` : ''}`}
        >
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

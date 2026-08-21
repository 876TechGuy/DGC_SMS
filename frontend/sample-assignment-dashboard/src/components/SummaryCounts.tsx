import type { DashboardSummary } from '../utils/filterUtils';

interface SummaryCountsProps {
  summary: DashboardSummary;
}

export function SummaryCounts({ summary }: SummaryCountsProps) {
  const items: Array<{ label: string; value: number; tone?: string; accent: string }> = [
    { label: 'Total Assigned', value: summary.totalAssigned, accent: '◼' },
    { label: 'In Progress', value: summary.inProgress, tone: 'info', accent: '◍' },
    { label: 'Overdue', value: summary.overdue, tone: 'danger', accent: '▲' },
    { label: 'Completed', value: summary.completed, tone: 'success', accent: '✓' },
  ];

  return (
    <dl className="summary-counts" aria-label="Assignment summary counts">
      {items.map((item) => (
        <div
          key={item.label}
          className={`summary-counts__item${item.tone ? ` summary-counts__item--${item.tone}` : ''}`}
        >
          <dt>
            <span className="summary-counts__accent" aria-hidden="true">
              {item.accent}
            </span>
            {item.label}
          </dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

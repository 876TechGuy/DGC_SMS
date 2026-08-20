export function EmptyState({ message }: { message?: string }) {
  return (
    <div className="dashboard-state" role="status">
      {message ?? 'No samples or tests match the current filters.'}
    </div>
  );
}

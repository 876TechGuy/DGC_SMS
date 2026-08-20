export function LoadingState() {
  return (
    <div className="dashboard-state" role="status" aria-live="polite">
      <span className="dashboard-state__spinner" aria-hidden="true" />
      Loading assignments…
    </div>
  );
}

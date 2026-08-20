/** Date/time helpers used across the dashboard for overdue/age calculations. */

export function isOverdue(dueDateTime: string, completedDateTime?: string | null): boolean {
  if (completedDateTime) return false;
  return new Date(dueDateTime).getTime() < Date.now();
}

export function isBlocked(status: string, blockedReason?: string | null): boolean {
  return status === 'On Hold' || Boolean(blockedReason);
}

export function sampleAgeHours(receivedDateTime: string): number {
  const receivedMs = new Date(receivedDateTime).getTime();
  return Math.max(0, Math.round((Date.now() - receivedMs) / (1000 * 60 * 60)));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

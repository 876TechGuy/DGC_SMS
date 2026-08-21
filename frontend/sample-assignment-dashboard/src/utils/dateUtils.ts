export function sampleAgeHours(receivedDateTime: string | null | undefined): number {
  if (!receivedDateTime) return 0;
  const receivedMs = new Date(receivedDateTime).getTime();
  if (Number.isNaN(receivedMs)) return 0;
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

export type TimeWindow = 6 | 12 | 24 | 36 | 'all';

export function getStartDateForWindow(timeWindow: TimeWindow): Date | null {
  if (timeWindow === 'all') return null;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - timeWindow + 1, 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function isDateInWindow(dateString: string, timeWindow: TimeWindow): boolean {
  const startDate = getStartDateForWindow(timeWindow);
  if (!startDate) return true;

  const value = new Date(`${dateString}T00:00:00`);
  return value >= startDate;
}

export function matchesRegion(region: string, selectedRegion: string): boolean {
  return selectedRegion === 'All' || region === selectedRegion;
}

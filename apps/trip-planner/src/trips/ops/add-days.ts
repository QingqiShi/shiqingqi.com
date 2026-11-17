const DAY_MS = 24 * 60 * 60 * 1000;

/** The calendar date a number of days after a date, both as `YYYY-MM-DD`. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** How many calendar days come from one `YYYY-MM-DD` date to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
}

/** The interval of the organise cron in `vercel.json`. */
export const ORGANISE_INTERVAL_MINUTES = 30;

/** The next time the organise cron is due, strictly after `now`. */
export function nextOrganiseAt(now: Date): Date {
  const interval = ORGANISE_INTERVAL_MINUTES * 60_000;
  return new Date((Math.floor(now.getTime() / interval) + 1) * interval);
}

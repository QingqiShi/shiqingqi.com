/** The day of the meeting that wrote a version, `YYYY-MM-DD`; the day it was written when no meeting did. */
export function decidedOn(row: {
  runAsOf: string | null;
  createdAt: Date;
}): string {
  return row.runAsOf ?? row.createdAt.toISOString().slice(0, 10);
}

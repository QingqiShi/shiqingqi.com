const DAY_MS = 86_400_000;

function addDays(iso: string, count: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + count * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** The date before a date. */
export function dayBefore(iso: string): string {
  return addDays(iso, -1);
}

/** The Monday of the week that holds a date. */
export function mondayOf(iso: string): string {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return addDays(iso, -((weekday + 6) % 7));
}

/** The weeks that hold the trip, each as its seven dates from Monday. */
export function calendarWeeks(days: { date: string }[]): string[][] {
  const last = days[days.length - 1].date;
  const weeks: string[][] = [];
  for (let monday = mondayOf(days[0].date); monday <= last;) {
    weeks.push(Array.from({ length: 7 }, (_, col) => addDays(monday, col)));
    monday = addDays(monday, 7);
  }
  return weeks;
}

import { addDays, parseDay } from "../ledger/add-days.ts";

function isWeekend(date: string): boolean {
  const weekday = new Date(parseDay(date)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

/** There is no holiday calendar: every weekday is a session. */
export function addWeekdays(date: string, count: number): string {
  const step = count < 0 ? -1 : 1;
  let result = date;
  let left = Math.abs(count);
  while (left > 0) {
    result = addDays(result, step);
    if (!isWeekend(result)) left -= 1;
  }
  return result;
}

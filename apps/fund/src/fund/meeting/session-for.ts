import { addWeekdays } from "../orders/add-weekdays.ts";

/** The session a meeting held on `date` prepares for: that day, or the next weekday. */
export function sessionFor(date: string): string {
  return addWeekdays(addWeekdays(date, -1), 1);
}

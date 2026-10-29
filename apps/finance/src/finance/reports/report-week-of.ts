import { endOfWeek, startOfWeek } from "../domain/dates/start-of-week.ts";

/** A Report week: Monday to Sunday, both included. */
interface ReportWeek {
  periodStart: string;
  periodEnd: string;
}

export function reportWeekOf(day: string): ReportWeek {
  return { periodStart: startOfWeek(day), periodEnd: endOfWeek(day) };
}

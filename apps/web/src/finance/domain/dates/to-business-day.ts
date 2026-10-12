import { addDays } from "./add-days.ts";
import { bankHolidaysOf } from "./bank-holidays-of.ts";
import { weekdayOf } from "./start-of-week.ts";

export const NON_BUSINESS_DAYS = ["stay", "next", "previous"] as const;

/** What a Rule does with an occurrence that falls on a weekend or a bank holiday. */
export type NonBusinessDay = (typeof NON_BUSINESS_DAYS)[number];

/** A weekday that is not an England and Wales bank holiday. */
export function isBusinessDay(day: string) {
  return (
    weekdayOf(day) <= 5 && !bankHolidaysOf(Number(day.slice(0, 4))).has(day)
  );
}

/** The day itself when it is a business day, else the nearest business day in the direction `nonBusinessDay` gives. */
export function toBusinessDay(day: string, nonBusinessDay: NonBusinessDay) {
  if (nonBusinessDay === "stay") return day;
  const step = nonBusinessDay === "next" ? 1 : -1;
  let moved = day;
  while (!isBusinessDay(moved)) moved = addDays(moved, step);
  return moved;
}

import type { Day, Moment } from "#src/trips/types.ts";

/** The id of the row of a day: the button of its menu. A sheet about the day grows from it. */
export function dayRowId(dayId: string) {
  return `menu:${dayId}`;
}

/** A moment with no words and one item shows as the row of that item, with the time. */
export function isOnlyItsItem(moment: Moment) {
  return !moment.text && !moment.highlight && moment.items.length === 1;
}

/**
 * What goes when a day goes: `count` is how many rows the editor shows for
 * the day, and `isEmpty` is true when the day has no row and no detail of
 * its own.
 */
export function dayPlan(day: Day) {
  const rowsWithTime = day.moments.reduce(
    (sum, moment) =>
      sum + (isOnlyItsItem(moment) ? 1 : 1 + moment.items.length),
    0,
  );
  const count =
    rowsWithTime +
    day.tips.length +
    day.dining.length +
    day.places.length +
    day.stay.lodging.length;
  const { summary, note, bookingUrl, sameAs } = day.stay;
  const details = [
    day.title,
    day.route,
    day.driving,
    summary,
    note,
    bookingUrl,
    sameAs?.dayId,
  ];
  return { count, isEmpty: count === 0 && !details.some(Boolean) };
}

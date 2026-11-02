/** Whether a to-do's dates are possible: it cannot start after it is due. */
export function datesInOrder({
  startDate,
  dueDate,
}: {
  startDate: string | null;
  dueDate: string | null;
}) {
  return startDate === null || dueDate === null || startDate <= dueDate;
}

/** Whether a to-do has not started by the end of `day`. */
export function startsAfter(
  { startDate }: { startDate: string | null },
  day: string,
) {
  return startDate !== null && startDate > day;
}

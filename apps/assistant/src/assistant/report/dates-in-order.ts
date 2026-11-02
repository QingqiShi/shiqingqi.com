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

/** Whether a to-do waits past `day`: it stays off that day's list until its follow-up date, which it may not have. */
export function waitsAfter(
  {
    waitingOn,
    followUpDate,
  }: { waitingOn?: string | null; followUpDate?: string | null },
  day: string,
) {
  if (!waitingOn) return false;
  return !followUpDate || followUpDate > day;
}

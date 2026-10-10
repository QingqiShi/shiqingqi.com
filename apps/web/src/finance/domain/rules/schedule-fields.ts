/** The Rule fields that set when it occurs: a change to one of them works out the next occurrence again. */
export const SCHEDULE_FIELDS = [
  "unit",
  "interval",
  "dayOfMonth",
  "weekday",
  "monthOfYear",
  "startsOn",
] as const;

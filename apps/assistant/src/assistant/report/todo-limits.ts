/** The limits of what the owner can send in one request. */
export const todoLimits = {
  /** The most to-dos that one request can close, delete or move to a date. */
  bulkTodos: 500,
  /** The most to-dos, or steps of a checklist, that one request can put in order. */
  orderedTodos: 500,
  /** The most days, weeks, months or years between two occurrences. */
  repeatInterval: 999,
  titleChars: 300,
  detailChars: 2000,
  checklistItemChars: 300,
  waitingOnChars: 200,
  searchChars: 200,
};

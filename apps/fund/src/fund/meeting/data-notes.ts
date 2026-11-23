/** Facts about the data and the process that a seat cannot see for itself. */
export const dataNotes = {
  record:
    "Stored closes, rates and fundamentals are the fund's record up to the session before the meeting. A web figure that differs (from another date or another source) is not a conflict that blocks a decision: use the stored figure, and say so if the difference matters.",
  earningsDate:
    "nextEarningsDate is null when the data source has no date, as for most London stocks. Then the analyst's note says what is known about the next report.",
  noLookups:
    "No one at this stage can look anything up or check anything before the open. A condition such as 'verify X before the order' cannot be met. Decide on what is known now: an unknown is a risk to weigh and to size for, not a step to wait for.",
} as const;

import type { HomeRun, HomeStatus, HomeView } from "./types.ts";

/** A PWA that comes back the next morning must show that morning's page. */
export const AWAY_BEFORE_REFRESH_MS = 30 * 60_000;

/**
 * The key of the refresh that a poll calls for, or null. A refresh chooses
 * the view again, so on the report view only a return after a long time
 * refreshes (`AWAY_BEFORE_REFRESH_MS`). On the today view a refresh shows what
 * changed: a run that ended, a report that is new to the owner, or a new
 * local day. A key in `done` has refreshed once, so a refresh that fails or
 * gives the same view does not repeat on every poll.
 */
export function refreshAfterPoll({
  view,
  renderedDate,
  previous,
  next,
  done,
}: {
  view: HomeView;
  /** The local date of the render that the page shows. */
  renderedDate: string;
  previous: HomeRun | null;
  next: HomeStatus;
  done: ReadonlySet<string>;
}): string | null {
  if (view !== "today") return null;
  const keys = [
    next.unseenReportDate === null ? null : `report:${next.unseenReportDate}`,
    next.localDate === renderedDate ? null : `date:${next.localDate}`,
    previous !== null && previous.id !== next.run?.id
      ? `run:${previous.id}`
      : null,
  ];
  return keys.find((key) => key !== null && !done.has(key)) ?? null;
}

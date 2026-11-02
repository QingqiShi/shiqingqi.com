import type { HomeStatus, HomeView } from "./types.ts";

/** What `/` shows: the newest report until the owner has seen it, then today. */
export function chooseHomeView({
  unseenReportDate,
}: Pick<HomeStatus, "unseenReportDate">): HomeView {
  return unseenReportDate === null ? "today" : "report";
}

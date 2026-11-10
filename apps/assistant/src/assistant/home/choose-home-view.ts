import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import type { HomeStatus, HomeView } from "./types.ts";

const VIEW_PARAMS = { report: "report", today: "plan" } as const;

/** The view that `?view=` asks for, or null when it asks for none. */
export function askedHomeView(asked?: string | string[]): HomeView | null {
  if (asked === VIEW_PARAMS.report) return "report";
  if (asked === VIEW_PARAMS.today) return "today";
  return null;
}

/**
 * What `/` shows: the view that `?view=` asks for, else the newest report
 * until the owner has seen it, then today.
 */
export function chooseHomeView(
  { unseenReportDate }: Pick<HomeStatus, "unseenReportDate">,
  asked?: string | string[],
): HomeView {
  return (
    askedHomeView(asked) ?? (unseenReportDate === null ? "today" : "report")
  );
}

/** The address of one view of the home page, which every render shows the same. */
export function homeViewHref(view: HomeView, locale: SupportedLocale) {
  return `${getLocalePath("/", locale)}?view=${VIEW_PARAMS[view]}`;
}

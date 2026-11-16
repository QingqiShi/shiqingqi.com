import { isPlainClick } from "@tuja/ui/utils/is-plain-click";
import type { MouseEvent } from "react";
import { tripLocationHash } from "../use-trip-location.ts";

/**
 * The props of a link to a day of the trip. A plain click opens the day in
 * place, which replaces the history entry, so that Back leaves the trip. A
 * click with a modifier key stays with the browser, which opens the link in a
 * new tab or window.
 */
export function dayLinkProps(
  index: number,
  todayIndex: number,
  onOpenDay: (index: number) => void,
) {
  return {
    href: tripLocationHash({ view: "day", day: index }),
    "aria-current": index === todayIndex ? ("date" as const) : undefined,
    onClick: (event: MouseEvent) => {
      if (!isPlainClick(event)) return;
      event.preventDefault();
      onOpenDay(index);
    },
  };
}

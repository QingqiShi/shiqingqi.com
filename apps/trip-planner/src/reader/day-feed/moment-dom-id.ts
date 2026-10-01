import { parseTimeToMinutes } from "./parse-time-to-minutes";

/** A stable DOM id for a moment, shared by the feed (sets it) and the glance
 *  card / auto-scroll (target it). */
export function momentDomId(dayN: number, time: string): string {
  return `d${String(dayN)}-moment-${String(parseTimeToMinutes(time))}`;
}

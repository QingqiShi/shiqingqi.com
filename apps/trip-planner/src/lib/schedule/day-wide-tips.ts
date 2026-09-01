import type { Day, Tip } from "@/data/types";

/** Tips with no `time`: general, all-day heads-ups shown in 今日须知. */
export function dayWideTips(day: Day): Tip[] {
  return (day.tips ?? []).filter((tip) => !tip.time);
}

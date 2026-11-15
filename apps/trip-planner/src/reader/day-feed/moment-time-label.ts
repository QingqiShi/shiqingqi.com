import { DAY_PARTS } from "@/trips/day-parts";
import type { DayPart, MomentTime } from "@/trips/types";

/** A representative clock time for each part of the day, in minutes. */
const PART_MINUTES: Record<DayPart, number> = {
  dawn: 4 * 60,
  "early-morning": 5 * 60 + 30,
  morning: 7 * 60,
  "late-morning": 9 * 60,
  daytime: 10 * 60,
  noon: 12 * 60,
  "early-afternoon": 13 * 60 + 30,
  afternoon: 14 * 60,
  dusk: 18 * 60,
  evening: 20 * 60,
  night: 22 * 60,
  "late-night": 23 * 60,
};

const PART_LABELS: Record<DayPart, string> = {
  dawn: "凌晨",
  "early-morning": "清晨",
  morning: "早上",
  "late-morning": "上午",
  daytime: "白天",
  noon: "中午",
  "early-afternoon": "午后",
  afternoon: "下午",
  dusk: "傍晚",
  evening: "晚上",
  night: "夜里",
  "late-night": "深夜",
};

/** Minutes past midnight, for ordering. A backup plan sorts after the day. */
export function momentMinutes(time: MomentTime): number {
  if (time === "backup") return 30 * 60;
  const part = dayPartOf(time);
  if (part) return PART_MINUTES[part];
  const [hours, minutes] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function momentTimeLabel(time: MomentTime): string {
  if (time === "backup") return "备选";
  const part = dayPartOf(time);
  return part ? PART_LABELS[part] : time;
}

function dayPartOf(time: MomentTime): DayPart | undefined {
  return DAY_PARTS.find((part) => part === time);
}

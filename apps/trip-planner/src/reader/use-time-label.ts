import { t } from "@tuja/i18n";
import { DAY_PARTS } from "#src/trips/day-parts.ts";
import type { DayPart, MomentTime } from "#src/trips/types.ts";

function dayPartOf(time: MomentTime): DayPart | undefined {
  return DAY_PARTS.find((part) => part === time);
}

/** Names a moment's time: a clock time as it is, a part of the day in words. */
export function useTimeLabel() {
  const parts: Record<DayPart, string> = {
    dawn: t({ en: "Dawn", zh: "凌晨" }),
    "early-morning": t({ en: "Early morning", zh: "清晨" }),
    morning: t({ en: "Morning", zh: "早上" }),
    "late-morning": t({ en: "Late morning", zh: "上午" }),
    daytime: t({ en: "Daytime", zh: "白天" }),
    noon: t({ en: "Noon", zh: "中午" }),
    "early-afternoon": t({ en: "Early afternoon", zh: "午后" }),
    afternoon: t({ en: "Afternoon", zh: "下午" }),
    dusk: t({ en: "Dusk", zh: "傍晚" }),
    evening: t({ en: "Evening", zh: "晚上" }),
    night: t({ en: "Night", zh: "夜里" }),
    "late-night": t({ en: "Late night", zh: "深夜" }),
  };
  const backup = t({ en: "Backup plan", zh: "备选" });
  return (time: MomentTime) => {
    if (time === "backup") return backup;
    const part = dayPartOf(time);
    return part ? parts[part] : time;
  };
}

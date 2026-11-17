import { t } from "@tuja/i18n";
import { useTimeLabel } from "#src/reader/use-time-label.ts";
import type { Slot } from "./build-outline.ts";
import { useDayLabels } from "./use-day-labels.ts";

/** What the toast says after a thing is added, saved or moved. */
export function usePlaceMessages() {
  const dayLabels = useDayLabels();
  const timeLabel = useTimeLabel();
  const saved = t({ en: "Saved", zh: "已保存" });
  const added = t({ en: "Added to {day}", zh: "已添加到{day}" });
  const movedToDay = t({ en: "Moved to {day}", zh: "已移到{day}" });
  const movedToTime = t({ en: "Moved to {time}", zh: "已改到 {time}" });
  const noTime = t({ en: "No time now", zh: "已改为不定时间" });
  return {
    added: (dayId: string) => added.replace("{day}", dayLabels.byId(dayId)),
    /** Names the new day or the new time when the save moved the thing. */
    saved(from: Slot, to: Slot) {
      if (to.dayId !== from.dayId) {
        return movedToDay.replace("{day}", dayLabels.byId(to.dayId));
      }
      if (to.time === from.time) return saved;
      return to.time === null
        ? noTime
        : movedToTime.replace("{time}", timeLabel(to.time));
    },
  };
}

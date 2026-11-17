import { t } from "@tuja/i18n";
import { useTimeLabel } from "#src/reader/use-time-label.ts";
import type { DayList } from "#src/trips/ops/op-schema.ts";
import type { Slot } from "./build-outline.ts";
import { useDayLabels } from "./use-day-labels.ts";
import { useListLabels } from "./use-field-labels.ts";

/** What the toast says after a thing is added, saved or moved. */
export function usePlaceMessages() {
  const dayLabels = useDayLabels();
  const timeLabel = useTimeLabel();
  const listLabels = useListLabels();
  const saved = t({ en: "Saved", zh: "已保存" });
  const added = t({ en: "Added to {day}", zh: "已添加到{day}" });
  const movedTo = t({ en: "Moved to {place}", zh: "已移到{place}" });
  const quoted = t({ en: "“{name}”", zh: "“{name}”" });
  return {
    added: (dayId: string) => added.replace("{day}", dayLabels.byId(dayId)),
    /**
     * Names the new day, the new time, or the list of the day that the
     * thing went to, when the save moved the thing. `list` is the list that
     * holds the thing when it has no time.
     */
    saved(from: Slot, to: Slot, list?: DayList) {
      if (to.dayId !== from.dayId) {
        return movedTo.replace("{place}", dayLabels.byId(to.dayId));
      }
      if (to.time === from.time) return saved;
      if (to.time !== null) {
        return movedTo.replace("{place}", timeLabel(to.time));
      }
      return list
        ? movedTo.replace("{place}", quoted.replace("{name}", listLabels[list]))
        : saved;
    },
  };
}

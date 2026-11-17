import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { dayDateLabel } from "#src/reader/date-label.ts";
import { newId } from "#src/trips/ops/new-id.ts";
import type { Day } from "#src/trips/types.ts";
import { dayRowId } from "./day-plan.ts";
import { useEditor } from "./editor-provider.tsx";
import { useDayLabels } from "./use-day-labels.ts";

/**
 * The changes to the days of the trip: add, remove and swap. Each toast
 * says what happened to the dates of the other days, and the screen shows
 * the day that the change made or moved.
 */
export function useDayChanges() {
  const editor = useEditor();
  const locale = useLocale();
  const dayLabels = useDayLabels();
  const { days } = editor.trip;
  const added = t({ en: "Day added", zh: "已添加一天" });
  const addedBefore = t({
    en: "Day added. The days after it moved one day later.",
    zh: "已添加一天，之后的每一天顺延了一天。",
  });
  const removed = t({ en: "{day} removed", zh: "已移除{day}" });
  const removedBefore = t({
    en: "{day} removed. The days after it moved one day earlier.",
    zh: "已移除{day}，之后的每一天提前了一天。",
  });
  const swapped = t({
    en: "Swapped with {day} · {date}",
    zh: "已与{day}对调 · {date}",
  });

  return {
    /** Adds a day before `before`, or at the end of the trip. */
    add(before?: Day) {
      const id = newId();
      const result = editor.change([{ op: "addDay", id, before: before?.id }], {
        message: before ? addedBefore : added,
        dayId: id,
      });
      if (result.ok) editor.reveal(dayRowId(id));
    },
    remove(day: Day) {
      const index = days.findIndex((each) => each.id === day.id);
      const isLast = index === days.length - 1;
      return editor.change([{ op: "removeDay", id: day.id }], {
        message: (isLast ? removed : removedBefore).replace(
          "{day}",
          dayLabels.number(index),
        ),
        dayId: (isLast ? days.at(index - 1) : days.at(index + 1))?.id,
      });
    },
    /** Swaps the plan of a day with the plan of the day before or after it. The dates stay. */
    swap(day: Day, withDay: Day) {
      const index = days.findIndex((each) => each.id === day.id);
      const other = days.findIndex((each) => each.id === withDay.id);
      const result = editor.change(
        [
          {
            op: "moveDay",
            id: day.id,
            before: other < index ? withDay.id : days.at(other + 1)?.id,
          },
        ],
        {
          message: swapped
            .replace("{day}", dayLabels.number(other))
            .replace("{date}", dayDateLabel(withDay.date, locale)),
          dayId: day.id,
        },
      );
      if (result.ok) editor.reveal(dayRowId(day.id));
    },
  };
}

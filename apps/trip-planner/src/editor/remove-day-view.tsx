"use client";

import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { dayDateLabel } from "#src/reader/date-label.ts";
import type { Day } from "#src/trips/types.ts";
import { dayPlan } from "./day-plan.ts";
import { useEditor } from "./editor-provider.tsx";
import { SheetActions } from "./sheet-actions.tsx";
import { useDayChanges } from "./use-day-changes.ts";

/** The question before a day with a plan goes: what goes with it, and what happens to the days after it. */
export function RemoveDayView({
  day,
  onDone,
}: {
  day: Day;
  onDone: () => void;
}) {
  const editor = useEditor();
  const locale = useLocale();
  const dayChanges = useDayChanges();
  const { count } = dayPlan(day);
  const isLast = editor.trip.days.at(-1)?.id === day.id;
  const withPlan = t({
    en: "Everything planned on {date} goes with the day: {count} in all.",
    zh: "{date}的全部安排会一并移除，共 {count} 项。",
  });
  const withDetails = t({
    en: "The details of {date} go with the day.",
    zh: "{date}的详情会一并移除。",
  });
  return (
    <div css={stack.item}>
      <Text as="p">
        {(count > 0 ? withPlan : withDetails)
          .replace("{date}", dayDateLabel(day.date, locale))
          .replace("{count}", String(count))}
      </Text>
      <Text as="p" tone="muted">
        {isLast
          ? t({
              en: "The trip gets one day shorter.",
              zh: "行程会缩短一天。",
            })
          : t({
              en: "The days after it move one day earlier, and the trip gets one day shorter.",
              zh: "之后的每一天都会提前一天，行程缩短一天。",
            })}
      </Text>
      <SheetActions>
        <Button look="ghost" onClick={onDone}>
          {t({ en: "Cancel", zh: "取消" })}
        </Button>
        <Button
          look="primary"
          intent="destructive"
          disabled={!editor.canEdit}
          onClick={() => {
            dayChanges.remove(day);
            onDone();
          }}
        >
          {t({ en: "Remove the day", zh: "移除这一天" })}
        </Button>
      </SheetActions>
    </div>
  );
}

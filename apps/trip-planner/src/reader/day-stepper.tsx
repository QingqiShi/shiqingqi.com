"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Select } from "@tuja/ui/components/select";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import type { Day } from "#src/trips/types.ts";
import { dayDateLabel } from "./date-label.ts";
import { useDayNumber } from "./use-day-number.ts";

/** Steps through the days of the trip: one back, one on, or any day. */
export function DayStepper({
  days,
  current,
  todayIndex,
  onSelect,
}: {
  days: Day[];
  current: number;
  /** The day that is today, or -1 outside the trip. */
  todayIndex: number;
  onSelect: (index: number) => void;
}) {
  const locale = useLocale();
  const dayNumber = useDayNumber();
  const today = t({ en: "Today", zh: "今天" });

  return (
    <div css={cluster.tight}>
      <Button
        look="outline"
        size="sm"
        icon={<CaretLeftIcon weight="bold" />}
        aria-label={t({ en: "Previous day", zh: "前一天" })}
        disabled={current === 0}
        onClick={() => {
          onSelect(current - 1);
        }}
      />
      <Select
        label={t({ en: "Day", zh: "日期" })}
        labelHidden
        size="sm"
        value={String(current)}
        onChange={(event) => {
          onSelect(Number(event.target.value));
        }}
        options={days.map((day, index) => ({
          value: String(index),
          label: [
            dayNumber(index),
            dayDateLabel(day.date, locale),
            index === todayIndex ? today : null,
          ]
            .filter(Boolean)
            .join(" · "),
        }))}
      />
      <Button
        look="outline"
        size="sm"
        icon={<CaretRightIcon weight="bold" />}
        aria-label={t({ en: "Next day", zh: "后一天" })}
        disabled={current === days.length - 1}
        onClick={() => {
          onSelect(current + 1);
        }}
      />
    </div>
  );
}

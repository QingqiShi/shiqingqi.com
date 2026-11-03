"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { formatSlotTime } from "./format-day.ts";
import type { CalendarSlot } from "./to-todo-item-data.ts";
import { useTodoStore } from "./todo-store-provider.tsx";

/** The time that a to-do holds on the calendar. A closed to-do shows it only while the calendar did not let it go. */
export function CalendarSlotLabel({
  slot,
  stillHeld,
}: {
  slot: CalendarSlot;
  stillHeld: boolean;
}) {
  const { today, locale, timeZone } = useTodoStore();
  return (
    <Text look="caption" tone="muted" css={styles.label}>
      <CalendarBlankIcon weight="bold" aria-hidden />
      {(stillHeld
        ? t({ en: "Still on your calendar: {time}", zh: "仍在日历上：{time}" })
        : t({ en: "On your calendar: {time}", zh: "日历：{time}" })
      ).replace("{time}", formatSlotTime(slot, { today, locale, timeZone }))}
    </Text>
  );
}

const styles = stylex.create({
  label: {
    display: "inline-flex",
    alignItems: "center",
    gap: rhythm.inline,
  },
});

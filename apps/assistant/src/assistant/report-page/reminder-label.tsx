"use client";

import { BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { formatReminderTime } from "./format-day.ts";
import { useTodoStore } from "./todo-store-provider.tsx";

/** When a to-do's next reminder goes out. */
export function ReminderLabel({ time }: { time: string }) {
  const { today, locale, timeZone } = useTodoStore();
  return (
    <Text look="caption" tone="muted" css={styles.label}>
      <BellIcon weight="bold" aria-hidden />
      {t({ en: "Reminder {time}", zh: "{time} 提醒" }).replace(
        "{time}",
        formatReminderTime(time, { today, locale, timeZone }),
      )}
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

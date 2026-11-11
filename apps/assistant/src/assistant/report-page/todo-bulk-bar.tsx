"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { MenuItem } from "@tuja/ui/components/menu-item";
import { Popover } from "@tuja/ui/components/popover";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { useEffectSticky } from "@tuja/ui/hooks/use-effect-sticky";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { layer, rhythm, shadow, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { addDays } from "../report/local-day-bounds.ts";
import { formatListDay } from "./format-day.ts";
import { nextWeekStart } from "./parse-todo-date.ts";
import type { TodoItemData } from "./to-todo-item-data.ts";
import { useTodoStore } from "./todo-store-provider.tsx";

/** The dates that a selection can move to. The popover mounts it when it opens. */
function BulkDateActions({
  onPick,
}: {
  onPick: (date: string | null) => void;
}) {
  const { today, locale } = useTodoStore();
  const [picked, setPicked] = useState("");
  const dates = [
    { date: today, label: t({ en: "Today", zh: "今天" }) },
    { date: addDays(today, 1), label: t({ en: "Tomorrow", zh: "明天" }) },
    { date: nextWeekStart(today), label: t({ en: "Next week", zh: "下周" }) },
  ];

  return (
    <div css={[stack.tight, styles.dateMenu]}>
      <div css={stack.rows}>
        {dates.map(({ date, label }) => (
          <MenuItem
            size="sm"
            key={date}
            trailing={formatListDay(date, locale)}
            onClick={() => {
              onPick(date);
            }}
          >
            {label}
          </MenuItem>
        ))}
        <MenuItem
          size="sm"
          onClick={() => {
            onPick(null);
          }}
        >
          {t({ en: "No date", zh: "不设日期" })}
        </MenuItem>
      </div>
      <form
        css={[cluster.tight, styles.dateForm]}
        onSubmit={(event) => {
          event.preventDefault();
          if (picked) onPick(picked);
        }}
      >
        <TextField
          type="date"
          label={t({ en: "Pick a date", zh: "选择日期" })}
          value={picked}
          controlCss={styles.dateField}
          onChange={(event) => {
            setPicked(event.target.value);
          }}
        />
        <Button type="submit" size="sm" look="outline" disabled={!picked}>
          {t({ en: "Move", zh: "移动" })}
        </Button>
      </form>
    </div>
  );
}

/**
 * What a selection can do. It parks above the tab bar and never reaches the
 * edge of the screen, so that iOS Safari does not take its colour for the
 * toolbar.
 */
export function TodoBulkBar({
  chosen,
  onStop,
}: {
  chosen: readonly TodoItemData[];
  onStop: () => void;
}) {
  const { closeMany, removeMany, moveMany } = useTodoStore();
  const sticky = useEffectSticky();
  const { ref, css: stickyCss } = sticky;
  const [dateOpen, setDateOpen] = useState(false);
  const count = chosen.length;
  const countText =
    count === 0
      ? t({ en: "Pick the to-dos", zh: "请点选待办" })
      : t({ en: "{count} selected", zh: "已选 {count} 项" }).replace(
          "{count}",
          String(count),
        );
  const dateLabel = t({ en: "Date", zh: "日期" });
  const ids = chosen.map((todo) => todo.id);
  const finish = (action: () => void) => () => {
    action();
    onStop();
  };

  return (
    <div
      ref={ref}
      css={[cardSurface.base, styles.bar, stickyCss]}
      role="group"
      aria-label={t({ en: "Selected to-dos", zh: "选中的待办" })}
    >
      <EffectCarrier value={sticky}>
        <div role="status" css={styles.count}>
          <Text look="label">{countText}</Text>
        </div>
        <div css={[cluster.tight, styles.actions]}>
          <Button
            size="sm"
            look="outline"
            disabled={count === 0}
            onClick={finish(() => {
              closeMany(ids);
            })}
          >
            {t({ en: "Done", zh: "完成" })}
          </Button>
          <Popover
            open={dateOpen}
            onOpenChange={setDateOpen}
            placement="top-end"
            aria-label={t({ en: "Change the date", zh: "改日期" })}
            trigger={(triggerProps) => (
              <Button
                {...triggerProps}
                size="sm"
                look="outline"
                disabled={count === 0}
              >
                {dateLabel}
              </Button>
            )}
          >
            <BulkDateActions
              onPick={(date) => {
                setDateOpen(false);
                moveMany(ids, date);
                onStop();
              }}
            />
          </Popover>
          <Button
            size="sm"
            look="outline"
            intent="destructive"
            disabled={count === 0}
            onClick={finish(() => {
              removeMany(ids);
            })}
          >
            {t({ en: "Delete", zh: "删除" })}
          </Button>
          <Button
            size="sm"
            look="ghost"
            icon={<XIcon weight="bold" />}
            aria-label={t({ en: "End the selection", zh: "结束选择" })}
            onClick={onStop}
          />
        </div>
      </EffectCarrier>
    </div>
  );
}

const styles = stylex.create({
  bar: {
    position: "sticky",
    insetBlockEnd: `calc(${space._3} + max(${tabViewTokens.barClearance}, env(safe-area-inset-bottom)))`,
    zIndex: layer.raised,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundColor: color.popover,
    boxShadow: shadow._4,
  },
  count: {
    minInlineSize: 0,
  },
  actions: {
    justifyContent: "flex-end",
  },
  dateMenu: {
    minInlineSize: "14rem",
  },
  dateForm: {
    alignItems: "flex-end",
    flexWrap: "nowrap",
  },
  dateField: {
    flexGrow: 1,
    minInlineSize: 0,
  },
});

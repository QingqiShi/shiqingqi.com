"use client";

import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Divider } from "@tuja/ui/components/divider";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { MenuItem } from "@tuja/ui/components/menu-item";
import { Popover } from "@tuja/ui/components/popover";
import { Section } from "@tuja/ui/components/section";
import { Spinner } from "@tuja/ui/components/spinner";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { mergeRefs } from "@tuja/ui/utils/merge-refs";
import { Fragment, useState } from "react";
import { shortDateLabel } from "#src/reader/date-label.ts";
import { TripText } from "#src/reader/trip-text.tsx";
import { dayAnchorId } from "#src/reader/use-trip-location.ts";
import { newId } from "#src/trips/ops/new-id.ts";
import type { Item } from "#src/trips/ops/op-schema.ts";
import type { Moment } from "#src/trips/types.ts";
import type { OutlineDay } from "./build-outline.ts";
import { useEditor } from "./editor-provider.tsx";
import { ItemRow, MomentRow } from "./item-row.tsx";
import type { OpenSheet } from "./types.ts";
import { useDayLabels } from "./use-day-labels.ts";

function DayMenu({
  outline,
  openSheet,
}: {
  outline: OutlineDay;
  openSheet: OpenSheet;
}) {
  const editor = useEditor();
  const locale = useLocale();
  const dayLabels = useDayLabels();
  const [open, setOpen] = useState(false);
  const { day, index } = outline;
  const { days } = editor.trip;
  const rowId = `menu:${day.id}`;
  const label = dayLabels.number(index);

  const movedTo = t({ en: "Plan moved to {date}", zh: "安排已移到{date}" });
  const dayAdded = t({ en: "Day added", zh: "已添加一天" });
  const dayRemoved = t({ en: "{day} removed", zh: "已移除{day}" });
  const menuLabel = t({ en: "{day} actions", zh: "{day}的操作" });

  const act = (action: () => void) => () => {
    setOpen(false);
    action();
  };
  const moveBefore = (before: string | undefined, date: string) => {
    editor.change([{ op: "moveDay", id: day.id, before }], {
      message: movedTo.replace("{date}", shortDateLabel(date, locale)),
      dayId: day.id,
    });
  };
  const earlier = index > 0 ? days[index - 1] : undefined;
  const later = days.at(index + 1);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="bottom-end"
      aria-label={menuLabel.replace("{day}", label)}
      trigger={(triggerProps) => (
        <Button
          {...triggerProps}
          ref={mergeRefs(triggerProps.ref, editor.rowRef(rowId))}
          size="sm"
          look="ghost"
          bleed="end"
          disabled={!editor.canEdit}
          icon={<DotsThreeIcon weight="bold" />}
          aria-label={menuLabel.replace("{day}", label)}
        />
      )}
    >
      <div css={[stack.rows, styles.menu]}>
        <MenuItem
          onClick={act(() => {
            openSheet({ kind: "day", day }, rowId);
          })}
        >
          {t({ en: "Day details…", zh: "当天详情…" })}
        </MenuItem>
        <Divider css={styles.divider} />
        {earlier ? (
          <MenuItem
            trailing={shortDateLabel(earlier.date, locale)}
            onClick={act(() => {
              moveBefore(earlier.id, earlier.date);
            })}
          >
            {t({ en: "Move plan earlier", zh: "安排前移一天" })}
          </MenuItem>
        ) : null}
        {later ? (
          <MenuItem
            trailing={shortDateLabel(later.date, locale)}
            onClick={act(() => {
              moveBefore(days.at(index + 2)?.id, later.date);
            })}
          >
            {t({ en: "Move plan later", zh: "安排后移一天" })}
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={act(() => {
            const id = newId();
            editor.change([{ op: "addDay", id, before: day.id }], {
              message: dayAdded,
              dayId: id,
            });
          })}
        >
          {t({ en: "Insert a day before", zh: "在前面插入一天" })}
        </MenuItem>
        {days.length > 1 ? (
          <>
            <Divider css={styles.divider} />
            <MenuItem
              intent="destructive"
              onClick={act(() => {
                editor.change([{ op: "removeDay", id: day.id }], {
                  message: dayRemoved.replace("{day}", label),
                  dayId: (earlier ?? later)?.id,
                });
              })}
            >
              {t({ en: "Remove the day", zh: "移除这一天" })}
            </MenuItem>
          </>
        ) : null}
      </div>
    </Popover>
  );
}

/** A moment with no words and one item shows as the row of that item, with the time. */
function isOnlyItsItem(moment: Moment) {
  return !moment.text && !moment.highlight && moment.items.length === 1;
}

/**
 * One day of the outline: a row for each moment with its items under it,
 * then the items with no time, then the beds, and the way to add to the
 * day.
 */
export function DayGroup({
  outline,
  openSheet,
}: {
  outline: OutlineDay;
  openSheet: OpenSheet;
}) {
  const editor = useEditor();
  const dayLabels = useDayLabels();
  const { day, index, moments, anyTime, lodging } = outline;
  const { canEdit } = editor;
  const label = dayLabels.number(index);
  const addId = `add:${day.id}`;
  const addTo = t({ en: "Add to {day}", zh: "添加到{day}" });
  const status = editor.statusOf(day.id);
  const sameAsIndex = day.stay.sameAs
    ? editor.trip.days.findIndex((each) => each.id === day.stay.sameAs?.dayId)
    : -1;
  const sameAs = t({ en: "Same bed as {day}", zh: "与{day}同住一处" });

  const itemRow = (
    item: Item,
    moment: Moment | null,
    place: "under" | "alone" | "list",
  ) => (
    <ItemRow
      key={item.id}
      item={item}
      indented={place === "under"}
      time={place === "alone" ? moment?.time : undefined}
      onOpen={
        canEdit
          ? () => {
              openSheet(
                { kind: "item", found: { item, dayId: day.id, moment } },
                item.id,
              );
            }
          : null
      }
    />
  );

  return (
    <Section
      id={dayAnchorId(index)}
      look="heading"
      level={2}
      title={dayLabels.dated(day, index)}
      description={
        day.title || day.route ? (
          <TripText>
            {[day.title, day.route].filter(Boolean).join(" · ")}
          </TripText>
        ) : undefined
      }
      actions={
        <>
          {status === "saving" ? (
            <Spinner size="sm" label={t({ en: "Saving", zh: "正在保存" })} />
          ) : null}
          <DayMenu outline={outline} openSheet={openSheet} />
        </>
      }
      css={styles.day}
    >
      <div css={stack.item}>
        {moments.length > 0 ? (
          <List aria-label={label}>
            {moments.map(({ moment, items }) =>
              isOnlyItsItem(moment) ? (
                itemRow(items[0], moment, "alone")
              ) : (
                <Fragment key={moment.id}>
                  <MomentRow
                    moment={moment}
                    onOpen={
                      canEdit
                        ? () => {
                            openSheet(
                              { kind: "moment", moment, dayId: day.id },
                              moment.id,
                            );
                          }
                        : null
                    }
                  />
                  {items.map((item) => itemRow(item, moment, "under"))}
                </Fragment>
              ),
            )}
          </List>
        ) : null}
        {anyTime.length > 0 ? (
          <Section title={t({ en: "Any time", zh: "不定时间" })} level={3}>
            <List>{anyTime.map((item) => itemRow(item, null, "list"))}</List>
          </Section>
        ) : null}
        {lodging.length > 0 || sameAsIndex >= 0 ? (
          <Section title={t({ en: "Stay", zh: "住宿" })} level={3}>
            <List>
              {sameAsIndex >= 0 ? (
                <ListRow detail={<TripText>{day.stay.sameAs?.label}</TripText>}>
                  {sameAs.replace("{day}", dayLabels.number(sameAsIndex))}
                </ListRow>
              ) : null}
              {lodging.map((item) => itemRow(item, null, "list"))}
            </List>
          </Section>
        ) : null}
        {moments.length + anyTime.length + lodging.length === 0 &&
        sameAsIndex < 0 ? (
          <Text tone="muted">
            {t({ en: "Nothing planned yet.", zh: "还没有安排。" })}
          </Text>
        ) : null}
        <div>
          <Button
            ref={editor.rowRef(addId)}
            look="outline"
            size="sm"
            icon={<PlusIcon weight="bold" />}
            disabled={!canEdit}
            onClick={() => {
              openSheet({ kind: "add", dayId: day.id }, addId);
            }}
          >
            {addTo.replace("{day}", label)}
          </Button>
        </div>
      </div>
    </Section>
  );
}

const styles = stylex.create({
  menu: {
    minInlineSize: "13rem",
  },
  divider: {
    marginBlock: rhythm.inline,
  },
  // A day that the hash of the address names stops under the bar that stays
  // at the top of the screen.
  day: {
    scrollMarginBlockStart: "4rem",
  },
});

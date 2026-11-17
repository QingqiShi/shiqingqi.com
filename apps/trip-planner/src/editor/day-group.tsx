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
import { dayDateLabel } from "#src/reader/date-label.ts";
import { TripText } from "#src/reader/trip-text.tsx";
import { dayAnchorId } from "#src/reader/use-trip-location.ts";
import type { Item } from "#src/trips/ops/op-schema.ts";
import type { Moment } from "#src/trips/types.ts";
import { locateItem, type OutlineDay } from "./build-outline.ts";
import { dayPlan, dayRowId, isOnlyItsItem } from "./day-plan.ts";
import { useEditor } from "./editor-provider.tsx";
import { ItemRow, MomentRow, pressTarget } from "./item-row.tsx";
import type { OpenSheet } from "./types.ts";
import { useDayChanges } from "./use-day-changes.ts";
import { useDayLabels } from "./use-day-labels.ts";
import { useListLabels } from "./use-field-labels.ts";

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
  const dayChanges = useDayChanges();
  const [open, setOpen] = useState(false);
  const { day, index } = outline;
  const { days } = editor.trip;
  const rowId = dayRowId(day.id);
  const label = dayLabels.number(index);
  const holdsPlans = !dayPlan(day).isEmpty;

  const swapWith = t({ en: "Swap with {day}", zh: "与{day}对调" });
  const menuLabel = t({ en: "{day} actions", zh: "{day}的操作" });

  const act = (action: () => void) => () => {
    setOpen(false);
    action();
  };
  const neighbours = [
    index > 0 ? index - 1 : null,
    index + 1 < days.length ? index + 1 : null,
  ].filter((each) => each !== null);

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
        {neighbours.map((other) => (
          <MenuItem
            key={other}
            trailing={dayDateLabel(days[other].date, locale)}
            onClick={act(() => {
              dayChanges.swap(day, days[other]);
            })}
          >
            {swapWith.replace("{day}", dayLabels.number(other))}
          </MenuItem>
        ))}
        <MenuItem
          onClick={act(() => {
            dayChanges.add(day);
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
                // A day with a plan asks before it goes.
                if (holdsPlans) openSheet({ kind: "removeDay", day }, rowId);
                else dayChanges.remove(day);
              })}
            >
              {holdsPlans
                ? t({ en: "Remove the day…", zh: "移除这一天…" })
                : t({ en: "Remove the day", zh: "移除这一天" })}
            </MenuItem>
          </>
        ) : null}
      </div>
    </Popover>
  );
}

/**
 * One day of the outline: a row for each moment with its items under it,
 * then the items with no time in the lists that the reader shows them in,
 * and the way to add to the day.
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
  const listLabels = useListLabels();
  const { day, index, moments, tips, dining, places, lodging } = outline;
  const { canEdit } = editor;
  const label = dayLabels.number(index);
  const addId = `add:${day.id}`;
  const addTo = t({ en: "Add to {day}", zh: "添加到{day}" });
  const status = editor.statusOf(day.id);
  const sameAsIndex = day.stay.sameAs
    ? editor.trip.days.findIndex((each) => each.id === day.stay.sameAs?.dayId)
    : -1;
  const sameAs = t({ en: "Same bed as {day}", zh: "与{day}同住一处" });
  const sameAsRowId = `same:${day.id}`;
  const repeatedId =
    sameAsIndex >= 0
      ? editor.trip.days[sameAsIndex].stay.lodging.at(0)?.id
      : undefined;
  const repeatedStay = repeatedId
    ? locateItem(editor.trip, repeatedId)
    : undefined;

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
  const list = (title: string, items: Item[]) =>
    items.length > 0 ? (
      <Section title={title} level={3}>
        <List>{items.map((item) => itemRow(item, null, "list"))}</List>
      </Section>
    ) : null;
  const isEmpty =
    moments.length +
      tips.length +
      dining.length +
      places.length +
      lodging.length ===
      0 && sameAsIndex < 0;

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
        {list(listLabels.tips, tips)}
        {list(listLabels.dining, dining)}
        {list(listLabels.places, places)}
        {lodging.length > 0 || sameAsIndex >= 0 ? (
          <Section title={listLabels.lodging} level={3}>
            <List>
              {sameAsIndex >= 0 ? (
                <ListRow
                  ref={editor.rowRef(sameAsRowId)}
                  detail={<TripText>{day.stay.sameAs?.label}</TripText>}
                  {...pressTarget(
                    canEdit && repeatedStay
                      ? () => {
                          openSheet(
                            { kind: "item", found: repeatedStay },
                            sameAsRowId,
                          );
                        }
                      : null,
                  )}
                >
                  {sameAs.replace("{day}", dayLabels.number(sameAsIndex))}
                </ListRow>
              ) : null}
              {lodging.map((item) => itemRow(item, null, "list"))}
            </List>
          </Section>
        ) : null}
        {isEmpty ? (
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
  // A day that the hash of the address names, or that the screen scrolls
  // to, stops under the bar that stays at the top of the screen.
  day: {
    scrollMarginBlockStart: "6rem",
  },
});

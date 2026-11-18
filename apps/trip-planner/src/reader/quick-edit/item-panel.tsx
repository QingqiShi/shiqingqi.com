"use client";

import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { MinusIcon } from "@phosphor-icons/react/dist/ssr/Minus";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { useId, useState } from "react";
import type { FoundItem } from "#src/trips/ops/find-item.ts";
import { itemName } from "#src/trips/ops/item-name.ts";
import { legStopsOps } from "#src/trips/ops/leg-stops-ops.ts";
import type { Item } from "#src/trips/ops/op-schema.ts";
import {
  mostNightsAt,
  nightsAt,
  removeItemOps,
  stayNightsOps,
} from "#src/trips/ops/stay-nights-ops.ts";
import type { Lodging, Restaurant } from "#src/trips/types.ts";
import { dayDateLabel } from "../date-label.ts";
import { TripText } from "../trip-text.tsx";
import type { QuickEdit } from "./quick-edit-context.ts";

type Leg = Extract<Item, { type: "nav" }>;
type Dining = Extract<Item, { type: "dining" }>;
type Stay = Extract<Item, { type: "lodging" }>;
type DiningStatus = NonNullable<Restaurant["status"]> | "none";
type StayStatus = NonNullable<Lodging["status"]>;

function useNamedMessage() {
  const message = t({ en: "“{name}”: {status}", zh: "“{name}”：{status}" });
  return (name: string, status: string) =>
    message.replace("{name}", name).replace("{status}", status);
}

/**
 * A choice of status for an item. `fieldOf` gives the stored status of a
 * choice. Each choice saves at once and closes the sheet.
 */
function StatusControl<V extends string>({
  quickEdit,
  item,
  value,
  options,
  fieldOf,
}: {
  quickEdit: QuickEdit;
  item: Dining | Stay;
  value: V | "";
  options: readonly { value: V; label: string }[];
  fieldOf: (value: V) => string | null;
}) {
  const namedMessage = useNamedMessage();
  const labelId = useId();
  const labelOf = (choice: V) =>
    options.find((option) => option.value === choice)?.label ?? choice;
  return (
    <div css={stack.tight}>
      <Text id={labelId} look="label" weight="semibold">
        {t({ en: "Status", zh: "状态" })}
      </Text>
      <SegmentedControl<V | "">
        aria-labelledby={labelId}
        fullWidth
        value={value}
        options={options}
        onChange={(next) => {
          if (next === "") return;
          const isChanged = quickEdit.change(
            [{ op: "setItem", id: item.id, fields: { status: fieldOf(next) } }],
            namedMessage(item.name, labelOf(next)),
          );
          if (isChanged) quickEdit.close();
        }}
      />
    </div>
  );
}

/** Booked, or one of the other places to eat. A first choice keeps its own value. */
function DiningStatusControl({
  quickEdit,
  item,
}: {
  quickEdit: QuickEdit;
  item: Dining;
}) {
  const booked = {
    value: "booked",
    label: t({ en: "Booked", zh: "已预订" }),
  } as const;
  const pick = {
    value: "pick",
    label: t({ en: "First choice", zh: "首选" }),
  } as const;
  const none = {
    value: "none",
    label: t({ en: "Option", zh: "备选" }),
  } as const;
  return (
    <StatusControl<DiningStatus>
      quickEdit={quickEdit}
      item={item}
      value={item.status ?? "none"}
      options={item.status === "pick" ? [booked, pick, none] : [booked, none]}
      fieldOf={(next) => (next === "none" ? null : next)}
    />
  );
}

function StayStatusControl({
  quickEdit,
  item,
}: {
  quickEdit: QuickEdit;
  item: Stay;
}) {
  return (
    <StatusControl<StayStatus>
      quickEdit={quickEdit}
      item={item}
      value={item.status ?? ""}
      options={[
        { value: "booked", label: t({ en: "Booked", zh: "已预订" }) },
        { value: "option", label: t({ en: "Option", zh: "备选" }) },
        { value: "pending", label: t({ en: "To confirm", zh: "待定" }) },
      ]}
      fieldOf={(next) => next}
    />
  );
}

/**
 * The nights in a row of the stay of a day, with a plus and a minus. Each
 * press saves at once and closes the sheet, so that its Undo can be reached.
 */
function NightsControl({
  quickEdit,
  item,
  dayId,
}: {
  quickEdit: QuickEdit;
  item: Stay;
  dayId: string;
}) {
  const locale = useLocale();
  const labelId = useId();
  const namedMessage = useNamedMessage();
  const oneNight = t({ en: "1 night", zh: "1 晚" });
  const someNights = t({ en: "{count} nights", zh: "{count} 晚" });
  const lastNight = t({
    en: "The last night is {date}",
    zh: "最后一晚是{date}",
  });
  const { trip, change, close } = quickEdit;
  const nights = nightsAt(trip, dayId);
  const most = mostNightsAt(trip, dayId);
  if (most <= 1 && nights <= 1) return null;
  const first = trip.days.findIndex((day) => day.id === dayId);
  const nightsLabel = (count: number) =>
    count === 1 ? oneNight : someNights.replace("{count}", String(count));
  const save = (next: number) => {
    const isChanged = change(
      stayNightsOps(trip, { dayId, nights: next, name: item.name }),
      namedMessage(item.name, nightsLabel(next)),
    );
    if (isChanged) close();
  };

  return (
    <div css={stack.tight}>
      <Text id={labelId} look="label" weight="semibold">
        {t({ en: "Nights", zh: "住几晚" })}
      </Text>
      <div css={row.item} role="group" aria-labelledby={labelId}>
        <Button
          look="outline"
          icon={<MinusIcon weight="bold" />}
          aria-label={t({ en: "One night fewer", zh: "少住一晚" })}
          disabled={nights <= 1}
          onClick={() => {
            save(nights - 1);
          }}
        />
        <Text weight="semibold" aria-live="polite">
          {nightsLabel(nights)}
        </Text>
        <Button
          look="outline"
          icon={<PlusIcon weight="bold" />}
          aria-label={t({ en: "One night more", zh: "多住一晚" })}
          disabled={nights >= most}
          onClick={() => {
            save(nights + 1);
          }}
        />
      </div>
      <Text look="caption" tone="muted">
        {lastNight.replace(
          "{date}",
          dayDateLabel(trip.days[first + nights - 1].date, locale),
        )}
      </Text>
    </div>
  );
}

/**
 * The stops on the way of a leg, each with a way to take it out, and a field
 * that adds one at the end. Each change saves at once and closes the sheet,
 * so that its Undo can be reached.
 */
function LegStopsControl({
  quickEdit,
  leg,
}: {
  quickEdit: QuickEdit;
  leg: Leg;
}) {
  const labelId = useId();
  const [stop, setStop] = useState("");
  const added = t({ en: "Stop added: {stop}", zh: "已添加停靠点：{stop}" });
  const removed = t({
    en: "Stop taken out: {stop}",
    zh: "已移除停靠点：{stop}",
  });
  const removeLabel = t({ en: "Take out {stop}", zh: "移除{stop}" });
  const fromTo = t({ en: "From {from} to {to}", zh: "从{from}到{to}" });
  const toOnly = t({ en: "To {to}", zh: "前往{to}" });
  const stops = leg.waypoints ?? [];
  const way = (leg.from ? fromTo.replace("{from}", leg.from) : toOnly).replace(
    "{to}",
    leg.to,
  );

  return (
    <div css={stack.item}>
      <div css={stack.text}>
        <Text id={labelId} look="label" weight="semibold">
          {t({ en: "Stops on the way", zh: "途中停靠点" })}
        </Text>
        <Text look="caption" tone="muted">
          <TripText>{way}</TripText>
        </Text>
      </div>
      {stops.length > 0 ? (
        <List aria-labelledby={labelId} density="compact">
          {stops.map((each, index) => (
            <ListRow
              // A leg can pass the same stop twice, so the place in the list is part of the key.
              key={`${String(index)}-${each}`}
              leading={<MapPinIcon weight="bold" />}
              actions={
                <Button
                  look="ghost"
                  size="sm"
                  icon={<XIcon weight="bold" />}
                  aria-label={removeLabel.replace("{stop}", each)}
                  onClick={() => {
                    const isChanged = quickEdit.change(
                      legStopsOps(leg, { remove: index }),
                      removed.replace("{stop}", each),
                    );
                    if (isChanged) quickEdit.close();
                  }}
                />
              }
            >
              <TripText>{each}</TripText>
            </ListRow>
          ))}
        </List>
      ) : null}
      <form
        css={[row.tight, styles.addStop]}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const ops = legStopsOps(leg, { add: stop });
          if (ops.length === 0) return;
          if (quickEdit.change(ops, added.replace("{stop}", stop.trim()))) {
            quickEdit.close();
          }
        }}
      >
        <TextField
          label={t({ en: "Add a stop", zh: "添加停靠点" })}
          autoComplete="off"
          value={stop}
          onChange={(event) => {
            setStop(event.target.value);
          }}
          css={styles.stopField}
        />
        <Button
          type="submit"
          look="outline"
          icon={<PlusIcon weight="bold" />}
          disabled={stop.trim() === ""}
        >
          {t({ en: "Add", zh: "添加" })}
        </Button>
      </form>
    </div>
  );
}

/** The quick changes of an item: its status, the nights of a stay, the stops of a leg, and Remove. */
export function ItemPanel({
  quickEdit,
  found,
}: {
  quickEdit: QuickEdit;
  found: FoundItem;
}) {
  const removed = t({ en: "Removed “{name}”", zh: "已移除“{name}”" });
  const { item, place } = found;
  const stayDayId =
    item.type === "lodging" && "dayId" in place ? place.dayId : null;

  return (
    <div css={stack.group}>
      {item.type === "dining" ? (
        <DiningStatusControl quickEdit={quickEdit} item={item} />
      ) : null}
      {item.type === "lodging" ? (
        <StayStatusControl quickEdit={quickEdit} item={item} />
      ) : null}
      {item.type === "lodging" && stayDayId !== null ? (
        <NightsControl quickEdit={quickEdit} item={item} dayId={stayDayId} />
      ) : null}
      {item.type === "nav" ? (
        <LegStopsControl quickEdit={quickEdit} leg={item} />
      ) : null}
      <div>
        <Button
          look="outline"
          intent="destructive"
          icon={<TrashIcon weight="bold" />}
          onClick={() => {
            const isRemoved = quickEdit.change(
              removeItemOps(quickEdit.trip, item.id),
              removed.replace("{name}", itemName(item)),
            );
            if (isRemoved) quickEdit.close();
          }}
        >
          {t({ en: "Remove", zh: "移除" })}
        </Button>
      </div>
    </div>
  );
}

const styles = stylex.create({
  addStop: {
    alignItems: "flex-end",
  },
  stopField: {
    flexGrow: 1,
    minInlineSize: 0,
  },
});

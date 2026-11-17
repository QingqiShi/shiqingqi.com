"use client";

import { AirplaneTiltIcon } from "@phosphor-icons/react/dist/ssr/AirplaneTilt";
import { BedIcon } from "@phosphor-icons/react/dist/ssr/Bed";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr/ForkKnife";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { ListChecksIcon } from "@phosphor-icons/react/dist/ssr/ListChecks";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { NavigationArrowIcon } from "@phosphor-icons/react/dist/ssr/NavigationArrow";
import { SignpostIcon } from "@phosphor-icons/react/dist/ssr/Signpost";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { ListRow } from "@tuja/ui/components/list-row";
import { Spinner } from "@tuja/ui/components/spinner";
import { Text } from "@tuja/ui/components/text";
import { space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { TripText } from "#src/reader/trip-text.tsx";
import { useTimeLabel } from "#src/reader/use-time-label.ts";
import type { Item, ItemKind } from "#src/trips/ops/op-schema.ts";
import type { Moment, MomentTime } from "#src/trips/types.ts";
import { itemName } from "./build-outline.ts";
import { useEditor } from "./editor-provider.tsx";
import { useKindLabels } from "./use-field-labels.ts";

const KIND_ICONS: Record<ItemKind, ReactNode> = {
  dining: <ForkKnifeIcon weight="bold" />,
  place: <MapPinIcon weight="bold" />,
  lodging: <BedIcon weight="bold" />,
  tip: <InfoIcon weight="bold" />,
  flight: <AirplaneTiltIcon weight="bold" />,
  nav: <NavigationArrowIcon weight="bold" />,
  checklist: <ListChecksIcon weight="bold" />,
  signSheet: <SignpostIcon weight="bold" />,
};

export function KindIcon({ kind }: { kind: ItemKind }) {
  return KIND_ICONS[kind];
}

/** The target of a row: a button that opens its form, or nothing while the edit controls are off. */
export function pressTarget(
  onOpen: (() => void) | null,
): { onClick: () => void } | { onClick?: never } {
  return onOpen ? { onClick: onOpen } : {};
}

/** What a row shows about its change that the server does not have yet, and what the person can do about it. */
function useRowState(id: string): {
  detail: ReactNode;
  trailing: ReactNode;
  below: ReactNode;
} {
  const { statusOf, queue, canEdit } = useEditor();
  const status = statusOf(id);
  const saving = t({ en: "Saving", zh: "正在保存" });
  const notSaved = t({ en: "Not saved", zh: "未保存" });
  const changed = t({
    en: "Changed by someone else. Open to choose.",
    zh: "其他人也改了这里，打开以选择。",
  });
  const retry = t({ en: "Try again", zh: "重试" });
  return {
    detail:
      status === "failed" ? (
        <Text as="span" tone="destructive">
          {notSaved}
        </Text>
      ) : status === "conflict" ? (
        <Text as="span" tone="warning">
          {changed}
        </Text>
      ) : undefined,
    trailing:
      status === "saving" ? <Spinner size="sm" label={saving} /> : undefined,
    below:
      status === "failed" ? (
        <Button
          size="sm"
          look="outline"
          disabled={!canEdit}
          onClick={queue.retry}
        >
          {retry}
        </Button>
      ) : undefined,
  };
}

/** A moment of a day: its time and its words. It opens the form of the moment. */
export function MomentRow({
  moment,
  onOpen,
}: {
  moment: Moment;
  onOpen: (() => void) | null;
}) {
  const { rowRef } = useEditor();
  const timeLabel = useTimeLabel();
  const state = useRowState(moment.id);
  const words = moment.text ?? moment.highlight?.label;
  return (
    <ListRow
      ref={rowRef(moment.id)}
      wrap
      leading={
        <Text as="span" look="bodySmall" weight="semibold" numeric>
          {timeLabel(moment.time)}
        </Text>
      }
      detail={state.detail}
      trailing={state.trailing}
      below={state.below}
      {...pressTarget(onOpen)}
    >
      {words ? (
        <TripText>{words}</TripText>
      ) : (
        <Text as="span" tone="muted">
          {t({ en: "No note", zh: "没有备注" })}
        </Text>
      )}
    </ListRow>
  );
}

/** An item of a day: its name and its kind. It opens the form of the item. */
export function ItemRow({
  item,
  indented = false,
  time,
  onOpen,
}: {
  item: Item;
  /** Whether the item is under the row of its moment. */
  indented?: boolean;
  /** The time of the item, when its moment has no row of its own. */
  time?: MomentTime;
  onOpen: (() => void) | null;
}) {
  const { rowRef } = useEditor();
  const kindLabels = useKindLabels();
  const timeLabel = useTimeLabel();
  const state = useRowState(item.id);
  return (
    <ListRow
      ref={rowRef(item.id)}
      wrap
      leading={
        time === undefined ? (
          <KindIcon kind={item.type} />
        ) : (
          <Text as="span" look="bodySmall" weight="semibold" numeric>
            {timeLabel(time)}
          </Text>
        )
      }
      detail={state.detail}
      trailing={
        state.trailing ?? (
          <Text as="span" look="caption" tone="muted">
            {kindLabels[item.type]}
          </Text>
        )
      }
      below={state.below}
      css={indented && styles.indented}
      {...pressTarget(onOpen)}
    >
      <TripText>{itemName(item)}</TripText>
    </ListRow>
  );
}

const styles = stylex.create({
  indented: {
    paddingInlineStart: space._7,
  },
});

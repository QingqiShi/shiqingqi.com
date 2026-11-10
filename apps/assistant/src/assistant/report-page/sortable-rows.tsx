"use client";

import {
  closestCenter,
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVerticalIcon } from "@phosphor-icons/react/dist/ssr/DotsSixVertical";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { controlSize, layer, shadow } from "@tuja/ui/tokens.stylex";
import { useState, type ReactNode } from "react";

const upAndDownInsideTheList: Modifier = ({
  transform,
  draggingNodeRect: row,
  containerNodeRect: list,
}) => ({
  ...transform,
  x: 0,
  y:
    row && list
      ? Math.min(
          Math.max(transform.y, list.top - row.top),
          list.bottom - row.bottom,
        )
      : transform.y,
});

// Only a pointer drags, and the row's menu tells a screen reader of each move.
// The default words of dnd-kit name a row by its id.
const noAnnouncements: Announcements = {
  onDragStart: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

/** One list whose rows, each with `useSortableRow`, can be dragged by their handles. */
export function SortableRows({
  ids,
  onMove,
  children,
}: {
  ids: readonly string[];
  onMove: (from: number, to: number) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor),
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[upAndDownInsideTheList]}
      accessibility={{ announcements: noAnnouncements }}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) {
          onMove(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
        }
      }}
    >
      <SortableContext items={[...ids]} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** What a row of `SortableRows` puts on its element, and where a pointer picks it up. */
export function useSortableRow(id: string, draggable: boolean) {
  const { setNodeRef, listeners, transform, transition, isDragging } =
    useSortable({ id });
  return {
    itemRef: setNodeRef,
    itemCss: [
      styles.moving(
        CSS.Translate.toString(transform) ?? "none",
        transition ?? "none",
      ),
      isDragging && styles.lifted,
    ],
    handle: draggable ? (
      <span
        {...listeners}
        aria-hidden
        css={[a11y.touchTarget, flex.center, styles.handle]}
      >
        <DotsSixVerticalIcon weight="bold" />
      </span>
    ) : (
      <span aria-hidden css={[styles.handle, styles.noHandle]} />
    ),
  };
}

/** The words for a screen reader's status line after a move, and the function that sets them. */
export function useMoveStatus() {
  const [status, setStatus] = useState("");
  const movedTo = t({
    en: "{title}: place {place} of {count}",
    zh: "{title}：第 {place} 项，共 {count} 项",
  });
  return [
    status,
    (title: string, place: number, count: number) => {
      setStatus(
        movedTo
          .replace("{place}", String(place))
          .replace("{count}", String(count))
          .replace("{title}", title),
      );
    },
  ] as const;
}

const styles = stylex.create({
  handle: {
    flexShrink: 0,
    inlineSize: controlSize._8,
    blockSize: controlSize._8,
    fontSize: controlSize._5,
    color: color.fgMuted,
    cursor: "grab",
    touchAction: "none",
  },
  // A row that cannot move keeps the handle's space, so that the titles of
  // the list end at the same place.
  noHandle: {
    visibility: "hidden",
  },
  moving: (transform: string, transition: string) => ({
    transform,
    transition: {
      default: transition,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  }),
  lifted: {
    position: "relative",
    zIndex: layer.content,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: shadow._4,
  },
});

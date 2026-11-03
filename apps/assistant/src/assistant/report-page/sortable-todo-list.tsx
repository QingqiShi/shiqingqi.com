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
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import {
  border,
  color,
  controlSize,
  layer,
  shadow,
} from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { spanOfMove } from "../report/rearrange.ts";
import type { TodoItemData } from "./to-todo-item-data.ts";
import { TodoItem } from "./todo-item.tsx";
import type { TodoMoves } from "./todo-row-menu.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

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

// Only a pointer drags, and the row menu tells a screen reader of each move.
// The default words of dnd-kit name a row by its id.
const noAnnouncements: Announcements = {
  onDragStart: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

function SortableRow({
  id,
  draggable,
  moves,
}: {
  id: string;
  draggable: boolean;
  moves: TodoMoves;
}) {
  const { setNodeRef, listeners, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <TodoItem
      id={id}
      showSource
      sortable={{
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
        ) : null,
        moves,
      }}
    />
  );
}

/** To-dos that can change places among themselves. */
function SortableRun({
  todos,
  onMoved,
}: {
  todos: readonly TodoItemData[];
  onMoved: (title: string, place: number, count: number) => void;
}) {
  const { reorder } = useTodoStore();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor),
  );
  const ids = todos.map((todo) => todo.id);
  const move = (from: number, to: number) => {
    reorder(spanOfMove(ids, from, to));
    onMoved(todos[from].title, to + 1, ids.length);
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[upAndDownInsideTheList]}
      accessibility={{ announcements: noAnnouncements }}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) {
          move(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
        }
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul css={[listSurface.list, styles.run]}>
          {ids.map((id, index) => (
            <SortableRow
              key={id}
              id={id}
              draggable={ids.length > 1}
              moves={{
                up:
                  index > 0
                    ? () => {
                        move(index, index - 1);
                      }
                    : null,
                down:
                  index < ids.length - 1
                    ? () => {
                        move(index, index + 1);
                      }
                    : null,
              }}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

/**
 * One card of to-dos that the owner can put in order, each run on its own: drag
 * a row by its handle, or use Move up and Move down in its menu.
 */
export function SortableTodoList({
  runs,
}: {
  runs: readonly { key: string; todos: readonly TodoItemData[] }[];
}) {
  const [status, setStatus] = useState("");
  const movedTo = t({
    en: "{title}: place {place} of {count}",
    zh: "{title}：第 {place} 项，共 {count} 项",
  });
  return (
    <div css={[cardSurface.base, listSurface.list]}>
      {runs.map((run) => (
        <SortableRun
          key={run.key}
          todos={run.todos}
          onMoved={(title, place, count) => {
            setStatus(
              movedTo
                .replace("{place}", String(place))
                .replace("{count}", String(count))
                .replace("{title}", title),
            );
          }}
        />
      ))}
      <div role="status" css={a11y.srOnly}>
        {status}
      </div>
    </div>
  );
}

const styles = stylex.create({
  run: {
    borderBlockStartWidth: { default: border.size_1, ":first-child": 0 },
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  handle: {
    flexShrink: 0,
    inlineSize: controlSize._8,
    blockSize: controlSize._8,
    fontSize: controlSize._5,
    color: color.fgMuted,
    cursor: "grab",
    touchAction: "none",
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

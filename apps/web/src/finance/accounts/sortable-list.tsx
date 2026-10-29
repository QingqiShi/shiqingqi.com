"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDndContext,
  useSensor,
  useSensors,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVerticalIcon } from "@phosphor-icons/react/dist/ssr/DotsSixVertical";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import {
  duration,
  easing,
  motionConstants,
  transition,
} from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import {
  border,
  color,
  controlSize,
  layer,
  shadow,
} from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode, Ref } from "react";
import { createPortal } from "react-dom";

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

function startsOnHandle({ event }: { event: Event }) {
  return (
    event.target instanceof Element &&
    event.target.closest("[data-drag-handle]") !== null
  );
}

/**
 * A mouse drags a row from anywhere. A finger drags the handle at once, or
 * the rest of the row after a press and hold, so that a swipe still scrolls.
 * The keyboard picks a row up from its handle.
 */
function useReorderSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 300, tolerance: 8 },
      bypassActivationConstraint: startsOnHandle,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
}

interface DragHandleProps {
  /** The name of what the handle moves. */
  name: string;
  activatorRef?: Ref<HTMLButtonElement>;
  attributes?: ReturnType<typeof useSortable>["attributes"];
}

/**
 * Where a finger or the keyboard picks a row up. Without `attributes`, it is
 * only drawn.
 *
 * Do not use `Button` here. `Button` cancels the Space key for its press
 * motion. dnd-kit ignores a cancelled key, so Space does not pick up the row.
 */
export function DragHandle({
  name,
  activatorRef,
  attributes,
}: DragHandleProps) {
  return (
    <button
      type="button"
      ref={activatorRef}
      tabIndex={-1}
      {...attributes}
      data-drag-handle=""
      aria-label={`${t({ en: "Move", zh: "移动" })} ${name}`}
      css={[
        buttonReset.base,
        corner.squircle_round,
        transition.colors,
        styles.handle,
      ]}
    >
      <DotsSixVerticalIcon weight="bold" aria-hidden />
    </button>
  );
}

type RenderItem<Item> = (
  item: Item,
  handle: ReactNode,
  isLifted: boolean,
) => ReactNode;

function SortableItem<Item>({
  id,
  item,
  name,
  renderItem,
  itemCss,
}: {
  id: string;
  item: Item;
  name: string;
  renderItem: RenderItem<Item>;
  itemCss: StyleProp;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      css={[
        itemCss,
        styles.moving(
          CSS.Translate.toString(transform) ?? "none",
          transition ?? "none",
        ),
        isDragging && styles.slot,
      ]}
    >
      {renderItem(
        item,
        <DragHandle
          name={name}
          activatorRef={setActivatorNodeRef}
          attributes={attributes}
        />,
        false,
      )}
    </li>
  );
}

function LiftedItem<Item>({
  items,
  idOf,
  nameOf,
  renderItem,
  css,
  itemCss,
}: SortableListProps<Item>) {
  const { active } = useDndContext();
  const item = items.find((candidate) => idOf(candidate) === active?.id);
  return createPortal(
    <DragOverlay modifiers={[verticalOnly]}>
      {item === undefined ? null : (
        <ul aria-hidden css={[styles.list, css]}>
          <li css={[itemCss, styles.lifted]}>
            {renderItem(item, <DragHandle name={nameOf(item)} />, true)}
          </li>
        </ul>
      )}
    </DragOverlay>,
    document.body,
  );
}

interface SortableListProps<Item> {
  items: readonly Item[];
  idOf: (item: Item) => string;
  /** The name a screen reader hears for the item. */
  nameOf: (item: Item) => string;
  onMove: (id: string, targetId: string) => void;
  /** Renders the inside of one row and places `handle` in it; `isLifted` is true for the copy under the pointer. */
  renderItem: RenderItem<Item>;
  css?: StyleProp;
  itemCss: StyleProp;
}

/**
 * A list whose items move by drag and by keyboard. Only the drop calls
 * `onMove`, with the item that moved and the item whose place it took.
 */
export function SortableList<Item>(props: SortableListProps<Item>) {
  const { items, idOf, nameOf, onMove, renderItem, css, itemCss } = props;
  const sensors = useReorderSensors();
  const picked = t({ en: "Picked up", zh: "已拿起" });
  const over = t({ en: "Moved to the place of", zh: "已移到此位置：" });
  const dropped = t({ en: "Dropped", zh: "已放下" });
  const cancelled = t({
    en: "Move cancelled. Back in its place:",
    zh: "已取消移动，回到原位：",
  });
  const instructions = t({
    en: "Press Space to pick it up. Move it with the Up and Down arrows, then press Space to drop it, or Escape to cancel.",
    zh: "按空格键拿起，用上下方向键移动，再按空格键放下，按 Esc 取消。",
  });
  const names = new Map(items.map((item) => [idOf(item), nameOf(item)]));
  const nameOfId = (id: string | number) => names.get(String(id)) ?? "";
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      accessibility={{
        screenReaderInstructions: { draggable: instructions },
        announcements: {
          onDragStart: ({ active }) => `${picked} ${nameOfId(active.id)}`,
          onDragOver: ({ over: target }) =>
            target ? `${over} ${nameOfId(target.id)}` : undefined,
          onDragEnd: ({ active }) => `${dropped} ${nameOfId(active.id)}`,
          onDragCancel: ({ active }) => `${cancelled} ${nameOfId(active.id)}`,
        },
      }}
      onDragEnd={({ active, over: target }) => {
        if (target && active.id !== target.id) {
          onMove(String(active.id), String(target.id));
        }
      }}
    >
      <SortableContext
        items={items.map(idOf)}
        strategy={verticalListSortingStrategy}
      >
        <ul css={[styles.list, css]}>
          {items.map((item) => (
            <SortableItem
              key={idOf(item)}
              id={idOf(item)}
              item={item}
              name={nameOf(item)}
              renderItem={renderItem}
              itemCss={itemCss}
            />
          ))}
        </ul>
      </SortableContext>
      <LiftedItem {...props} />
    </DndContext>
  );
}

const lift = stylex.keyframes({
  from: { scale: 1, boxShadow: shadow._1 },
});

const styles = stylex.create({
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  handle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: controlSize._8,
    blockSize: controlSize._8,
    fontSize: controlSize._5,
    color: color.fgMuted,
    backgroundColor: {
      default: "transparent",
      ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
    },
    cursor: "grab",
    touchAction: "none",
  },
  moving: (transform: string, transitionValue: string) => ({
    transform,
    transition: transitionValue,
  }),
  slot: {
    opacity: 0,
  },
  lifted: {
    position: "relative",
    zIndex: layer.overlay,
    cursor: "grabbing",
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `0 0 0 ${border.size_1} ${color.border}, ${shadow._4}`,
    scale: 1.02,
    animationName: {
      default: lift,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    animationDuration: duration._300,
    animationTimingFunction: easing.spring,
  },
});

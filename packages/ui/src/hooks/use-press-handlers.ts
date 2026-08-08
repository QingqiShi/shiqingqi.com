"use client";

import * as stylex from "@stylexjs/stylex";
import {
  type RefObject,
  type PointerEvent as ReactPointerEvent,
  type PointerEventHandler,
  type KeyboardEvent,
  type KeyboardEventHandler,
  type MouseEvent,
  type MouseEventHandler,
} from "react";
import { usePressAnimation } from "./use-press-animation.ts";

interface UsePressHandlersOptions<T extends HTMLElement> {
  disabled?: boolean;
  targetRef: RefObject<T | null>;
  onPointerDown?: PointerEventHandler<T>;
  onPointerUp?: PointerEventHandler<T>;
  onPointerMove?: PointerEventHandler<T>;
  onKeyDown?: KeyboardEventHandler<T>;
  onKeyUp?: KeyboardEventHandler<T>;
  onContextMenu?: MouseEventHandler<T>;
  onClick?: MouseEventHandler<T>;
}

interface UsePressHandlersReturn<T extends HTMLElement> {
  isPressed: boolean;
  releasedOutside: boolean;
  pressedCss: ReturnType<typeof styles.nudge> | null;
  handlers: {
    onPointerDown: PointerEventHandler<T>;
    onPointerUp: PointerEventHandler<T>;
    onPointerMove: PointerEventHandler<T>;
    onKeyDown: KeyboardEventHandler<T>;
    onKeyUp: KeyboardEventHandler<T>;
    onContextMenu: MouseEventHandler<T>;
    onClick: MouseEventHandler<T>;
  };
}

export function usePressHandlers<T extends HTMLElement>({
  disabled,
  targetRef,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  onKeyDown,
  onKeyUp,
  onContextMenu,
  onClick,
}: UsePressHandlersOptions<T>): UsePressHandlersReturn<T> {
  const {
    isPressed,
    releasedOutside,
    nudgeOffset,
    handlers: pressHandlers,
    shouldAllowClick,
  } = usePressAnimation({
    disabled,
    targetRef,
  });

  function handlePointerDown(event: ReactPointerEvent<T>) {
    onPointerDown?.(event);
    pressHandlers.onPointerDown(event);
  }

  function handlePointerUp(event: ReactPointerEvent<T>) {
    onPointerUp?.(event);
    pressHandlers.onPointerUp(event);
  }

  function handlePointerMove(event: ReactPointerEvent<T>) {
    onPointerMove?.(event);
    pressHandlers.onPointerMove(event);
  }

  function handleKeyDown(event: KeyboardEvent<T>) {
    onKeyDown?.(event);
    pressHandlers.onKeyDown(event);
  }

  function handleKeyUp(event: KeyboardEvent<T>) {
    onKeyUp?.(event);
    pressHandlers.onKeyUp(event);
  }

  function handleContextMenu(event: MouseEvent<T>) {
    onContextMenu?.(event);
    pressHandlers.onContextMenu(event);
  }

  function handleClick(event: MouseEvent<T>) {
    if (!shouldAllowClick()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  }

  const pressedCss =
    isPressed && !disabled
      ? styles.nudge(`${String(nudgeOffset.x)}px`, `${String(nudgeOffset.y)}px`)
      : null;

  return {
    isPressed,
    releasedOutside,
    pressedCss,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerMove: handlePointerMove,
      onKeyDown: handleKeyDown,
      onKeyUp: handleKeyUp,
      onContextMenu: handleContextMenu,
      onClick: handleClick,
    },
  };
}

const styles = stylex.create({
  nudge: (x: string, y: string) => ({
    "--button-nudge-x": x,
    "--button-nudge-y": y,
  }),
});

"use client";

import * as stylex from "@stylexjs/stylex";
import React, { useLayoutEffect, useRef, useState } from "react";
import { useControlled } from "../hooks/use-controlled.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import {
  border,
  color,
  controlSize,
  font,
  layer,
  opacity,
  ratio,
  shadow,
} from "../tokens.stylex.ts";
import { mergeRefs } from "../utils/merge-refs.ts";
import { switchTokens } from "./switch.stylex.ts";

export type SwitchState = "off" | "on" | "indeterminate";

type SwitchSize = "sm" | "md" | "lg";

interface SwitchProps extends Omit<
  React.ComponentProps<"input">,
  "checked" | "onChange" | "size" | "className" | "style"
> {
  /**
   * Controlled state — the parent owns it and must update it via `onChange`.
   * Omit for an uncontrolled switch.
   */
  value?: SwitchState;
  /** Initial state for an uncontrolled switch. Ignored once `value` is set. */
  defaultValue?: SwitchState;
  /** Fires with the next state on every user toggle (pointer, keyboard, label). */
  onChange?: (state: SwitchState) => void;
  /**
   * Track-height scale via `controlSize`; the width and thumb scale with it.
   * Every size, `md` included, grows below the `md` breakpoint like the
   * `controlSize` scale.
   */
  size?: SwitchSize;
}

/**
 * A three-state toggle (`off` / `on` / `indeterminate`) that supports pointer
 * drag, keyboard, and click activation, controlled or uncontrolled.
 *
 * Renders as `<input role="switch">`, so it needs an accessible name: pass
 * `aria-label`, or associate a `<label>` so clicking it toggles the switch.
 */
export function Switch({
  value: valueProp,
  defaultValue,
  onChange,
  size = "md",
  css,
  ref: forwardedRef,
  ...rest
}: SwitchProps) {
  const elRef = useRef<HTMLInputElement>(null);
  const hasSetInitialRenderedRef = useRef(false);
  // Set once a pointer release or Space keypress toggles state, so the
  // browser's trailing `click` does not repeat it. An unset `click` came from
  // an associated `<label>` instead.
  const toggleHandledRef = useRef(false);

  const [value, setValue] = useControlled({
    controlled: valueProp,
    defaultValue: defaultValue ?? "off",
  });

  function setControlledValue(newValue: SwitchState) {
    setValue(newValue);
    onChange?.(newValue);
  }

  useLayoutEffect(() => {
    if (!elRef.current) {
      return;
    }
    elRef.current.indeterminate = value === "indeterminate";
    elRef.current.checked = value === "on";
  }, [value]);

  const {
    isDragging,
    position,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = useSwitchDrag({
    elRef,
    toggleHandledRef,
    value,
    disabled: rest.disabled,
    setControlledValue,
  });

  // Enables animation only after mount, so a route or locale change does not
  // animate the switch.
  const [initialRendered, setInitialRendered] = useState(false);

  const setInputRef = mergeRefs(elRef, forwardedRef, (node) => {
    if (node && !hasSetInitialRenderedRef.current) {
      hasSetInitialRenderedRef.current = true;
      setInitialRendered(true);
    }
  });

  return (
    <input
      ref={setInputRef}
      {...rest}
      css={[
        buttonReset.base,
        a11y.focusRing,
        corner.radius_round,
        styles.switch,
        sizeStyles[size],
        initialRendered && styles.animate,
        isDragging && styles.dragging(position),
        css,
      ]}
      role="switch"
      type="checkbox"
      onPointerDown={handleDragStart}
      onPointerUp={handleDragEnd}
      onPointerMove={handleDragMove}
      onKeyDown={(e) => {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          // A held key auto-repeats keydown, but a native switch toggles once
          // per press. `preventDefault` runs first so Space still can't
          // scroll during repeats.
          if (e.repeat) return;
          // Space activation dispatches a trailing click on keyup; guard so it
          // doesn't double-toggle. Enter dispatches no click, so it needs none.
          if (e.code === "Space") {
            toggleHandledRef.current = true;
          }
          setControlledValue(value === "on" ? "off" : "on");
        }
      }}
      onChange={(e) => {
        e.preventDefault();
      }}
      onClick={(e) => {
        e.preventDefault();
        if (toggleHandledRef.current) {
          toggleHandledRef.current = false;
          return;
        }
        // With no preceding toggle, this click came from an associated
        // `<label>`; toggle so label activation still works.
        if (rest.disabled) {
          return;
        }
        setControlledValue(value === "on" ? "off" : "on");
      }}
    />
  );
}

/**
 * Pointer-drag mechanics for `Switch`: tracks the thumb's live position while
 * dragging, and commits `on`/`off` from which half of the track it's released
 * over. Falls back to a plain toggle when the pointer never crosses the
 * 2px move threshold that distinguishes a drag from a click.
 */
function useSwitchDrag({
  elRef,
  toggleHandledRef,
  value,
  disabled,
  setControlledValue,
}: {
  elRef: React.RefObject<HTMLInputElement | null>;
  toggleHandledRef: React.RefObject<boolean>;
  value: SwitchState;
  disabled: boolean | undefined;
  setControlledValue: (next: SwitchState) => void;
}) {
  const initialRectRef = useRef<DOMRect | null>(null);
  const initialClientXRef = useRef(0);
  const lastClientXRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<number | null>(null);

  function handleDragStart(e: React.PointerEvent<HTMLInputElement>) {
    if (
      disabled ||
      !elRef.current ||
      (e.pointerType === "mouse" && e.button !== 0)
    ) {
      return;
    }
    initialRectRef.current = elRef.current.getBoundingClientRect();
    initialClientXRef.current = e.clientX;

    elRef.current.setPointerCapture(e.pointerId);
  }

  function handleDragMove(e: React.PointerEvent<HTMLInputElement>) {
    const rect = initialRectRef.current;
    const clientX = initialClientXRef.current;
    if (!rect) {
      return;
    }

    if (!isDragging && Math.abs(e.clientX - clientX) < 2) {
      return;
    }
    setIsDragging(true);

    lastClientXRef.current = e.clientX;
    const x = e.clientX - rect.left - rect.height / 2;
    const clampedX = Math.max(0, Math.min(rect.width - rect.height, x));
    setPosition(clampedX);

    const midPoint = rect.left + rect.width / 2;
    const newState = lastClientXRef.current > midPoint ? "on" : "off";
    if (newState !== value) {
      setControlledValue(newState);
    }
  }

  function handleDragEnd(e: React.PointerEvent<HTMLInputElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) {
      return;
    }

    // This pointer interaction owns the toggle, so the trailing `click` (see
    // `onClick`) must not repeat it.
    toggleHandledRef.current = true;

    if (isDragging) {
      const rect = initialRectRef.current;
      if (elRef.current && rect) {
        if (elRef.current.indeterminate) {
          elRef.current.indeterminate = false;
        }

        const midPoint = rect.left + rect.width / 2;
        const newState = lastClientXRef.current > midPoint ? "on" : "off";
        setControlledValue(newState);
      }
    } else {
      setControlledValue(value === "on" ? "off" : "on");
    }

    elRef.current?.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    setPosition(null);
    initialRectRef.current = null;
  }

  return {
    isDragging,
    position,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}

const styles = stylex.create({
  switch: {
    fontSize: font.uiControl,
    margin: 0,
    aspectRatio: ratio.double,
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": opacity.disabled },
    display: "flex",
    height: switchTokens.trackHeight,
    padding: border.size_2,
    position: "relative",
    transition: `background-color ${duration._200} ${easing.ease}`,
    backgroundColor: {
      default: color.surfaceNeutralSubtle,
      ":checked": color.accent,
    },
    boxShadow: {
      default: shadow._2,
      ":hover": { "::before": shadow._3 },
    },
    touchAction: "none",

    [switchTokens.thumbPosition]: {
      default: 0,
      ":checked": switchTokens.trackHeight,
      ":indeterminate": `calc(${switchTokens.trackHeight} / 2)`,
    },
    [switchTokens.thumbShadow]: {
      default: null,
      ":hover": shadow._3,
    },

    "::before": {
      backgroundColor: color.bgSurfaceBright,
      borderRadius: border.radius_round,
      cornerShape: "round",
      boxShadow: switchTokens.thumbShadow,
      content: "",
      display: "block",
      width: `calc(${switchTokens.trackHeight} - ${border.size_2} * 2)`,
      aspectRatio: ratio.square,
      transform: `translateX(${switchTokens.thumbPosition})`,
      transition: null,
      zIndex: layer.content,
    },
  },
  animate: {
    "::before": {
      transition: {
        default: `transform ${switchTokens.thumbTransitionDuration} ${easing.ease}, box-shadow ${duration._400} ${easing.ease}`,
        [motionConstants.REDUCED_MOTION]: `box-shadow ${duration._400} ${easing.ease}`,
      },
    },
  },
  dragging: (position: number | null) => ({
    [switchTokens.thumbPosition]: `${String(position)}px`,
    "::before": {
      transition: null,
    },
  }),
});

// Each size sets the `switchTokens.trackHeight` knob; `styles.switch` derives
// height, width, thumb size, and travel from it. `md` reproduces the historic
// default, so omitting `size` stays pixel-identical.
const sizeStyles = stylex.create({
  sm: { [switchTokens.trackHeight]: controlSize._8 },
  md: { [switchTokens.trackHeight]: controlSize._9 },
  lg: { [switchTokens.trackHeight]: controlSize._10 },
});

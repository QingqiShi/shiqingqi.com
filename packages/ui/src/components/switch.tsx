"use client";

import * as stylex from "@stylexjs/stylex";
import React, { useLayoutEffect, useRef, useState } from "react";
import { useControlled } from "../hooks/use-controlled.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { motionConstants } from "../primitives/motion.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import {
  border,
  color,
  controlSize,
  layer,
  ratio,
  shadow,
} from "../tokens.stylex.ts";
import { mergeRefs } from "../utils/merge-refs.ts";
import { switchTokens } from "./switch.stylex.ts";

export type SwitchState = "off" | "on" | "indeterminate";

interface SwitchProps extends Omit<
  React.ComponentProps<"input">,
  "checked" | "onChange"
> {
  /**
   * Controlled state. When provided, the parent owns the value and must update
   * it via `onChange`. Omit for an uncontrolled switch.
   */
  value?: SwitchState;
  /** Initial state for an uncontrolled switch. Ignored once `value` is set. */
  defaultValue?: SwitchState;
  /** Fires with the next state on every user toggle (pointer, keyboard, label). */
  onChange?: (state: SwitchState) => void;
}

/**
 * A three-state toggle (`off` / `on` / `indeterminate`) that supports pointer
 * drag, keyboard, and click activation, and works controlled or uncontrolled.
 *
 * Accessibility: the switch renders as an `<input role="switch">`, so it needs
 * an accessible name. Provide one with `aria-label`, or associate a `<label>`
 * (via `htmlFor`/`id` or by wrapping) — clicking the label toggles the switch.
 */
export function Switch({
  value: valueProp,
  defaultValue,
  onChange,
  className,
  style,
  ref: forwardedRef,
  ...rest
}: SwitchProps) {
  const elRef = useRef<HTMLInputElement>(null);
  const hasSetInitialRenderedRef = useRef(false);
  // Set when a pointer release or Space keypress has already performed the
  // toggle, so the trailing `click` each of those dispatches doesn't repeat it.
  // A `click` seen without it was forwarded from an associated <label>.
  const toggleHandledRef = useRef(false);

  // Optionally controlled state
  const [value, setValue] = useControlled({
    controlled: valueProp,
    defaultValue: defaultValue ?? "off",
  });

  function setControlledValue(newValue: SwitchState) {
    setValue(newValue);
    onChange?.(newValue);
  }

  // Sync value with input due to check box having two different value states (specifically `indeterminate`)
  useLayoutEffect(() => {
    if (!elRef.current) {
      return;
    }
    elRef.current.indeterminate = value === "indeterminate";
    elRef.current.checked = value === "on";
  }, [value]);

  // States and refs for tracking dragging state
  const initialRectRef = useRef<DOMRect | null>(null);
  const initialClientXRef = useRef(0);
  const lastClientXRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<number | null>(null);

  function handleDragStart(e: React.PointerEvent<HTMLInputElement>) {
    if (
      rest.disabled ||
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

    // Has to move at least 2px to be considered dragging
    if (!isDragging && Math.abs(e.clientX - clientX) < 2) {
      return;
    }
    setIsDragging(true);

    // Get thumb position
    lastClientXRef.current = e.clientX;
    const x = e.clientX - rect.left - rect.height / 2;
    const clampedX = Math.max(0, Math.min(rect.width - rect.height, x));
    setPosition(clampedX);

    // Actually modify the value
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

    // This pointer interaction owns the toggle; the trailing click must not
    // repeat it (see onClick).
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

  // Enable animation styles only after the component has fully mounted
  // This prevents switches from animating when switching routes or changing locales
  const [initialRendered, setInitialRendered] = useState(false);

  // Keep the internal ref, forward to a caller-supplied ref (the input `ref`
  // survives the props Omit), and enable animations after first mount — all
  // via a single merged ref callback (the merge runs at commit, not render).
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
      className={className}
      style={style}
      css={[
        buttonReset.base,
        a11y.focusRing,
        styles.switch,
        initialRendered && styles.animate,
        isDragging && styles.dragging(position),
      ]}
      role="switch"
      type="checkbox"
      onPointerDown={handleDragStart}
      onPointerUp={handleDragEnd}
      onPointerMove={handleDragMove}
      onKeyDown={(e) => {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          // A held key auto-repeats keydown; a native switch toggles once per
          // press, so ignore repeats (but still preventDefault above to keep
          // Space from scrolling). The initial keydown already flipped state
          // and armed the click guard below.
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
        // Always suppress the native checkbox toggle — state is managed here.
        e.preventDefault();
        // A pointer release or Space keypress already handled this toggle.
        if (toggleHandledRef.current) {
          toggleHandledRef.current = false;
          return;
        }
        // No preceding toggle: this click was forwarded from an associated
        // <label>. Toggle so label activation works.
        if (rest.disabled) {
          return;
        }
        setControlledValue(value === "on" ? "off" : "on");
      }}
    />
  );
}

const styles = stylex.create({
  switch: {
    fontSize: controlSize._4,
    margin: 0,

    // Custom styles
    aspectRatio: ratio.double,
    borderRadius: border.radius_round,
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": 0.6 },
    display: "flex",
    height: controlSize._9,
    padding: border.size_2,
    position: "relative",
    transition: `background-color 0.2s ease`,
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
      ":checked": controlSize._9,
      ":indeterminate": `calc(${controlSize._9} / 2)`,
    },
    [switchTokens.thumbShadow]: {
      default: null,
      ":hover": shadow._3,
    },

    // Pseudo elements
    "::before": {
      backgroundColor: color.bgSurfaceBright,
      borderRadius: border.radius_round,
      boxShadow: switchTokens.thumbShadow,
      content: "",
      display: "block",
      width: `calc(${controlSize._9} - ${border.size_2} * 2)`,
      aspectRatio: ratio.square,
      transform: `translateX(${switchTokens.thumbPosition})`,
      transition: null,
      zIndex: layer.content,
    },
  },
  animate: {
    "::before": {
      transition: {
        default: `transform ${switchTokens.thumbTransitionDuration} ease, box-shadow 0.4s ease`,
        [motionConstants.REDUCED_MOTION]: "box-shadow 0.4s ease",
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

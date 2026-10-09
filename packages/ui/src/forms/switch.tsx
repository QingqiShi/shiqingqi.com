"use client";

import * as stylex from "@stylexjs/stylex";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { floodReach } from "../effect-layer/outline-param.ts";
import { dispatchSweep } from "../effect-layer/sweep-event.ts";
import { sweepConsts } from "../effect-layer/sweep.stylex.ts";
import { useSweep } from "../effect-layer/use-sweep.ts";
import { useControlled } from "../hooks/use-controlled.ts";
import { mergeRefs } from "../merge-refs.ts";
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
  layer,
  opacity,
  ratio,
  shadow,
} from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { switchTokens } from "./switch.stylex.ts";

export type SwitchState = "off" | "on" | "indeterminate";

interface SwitchProps extends Omit<
  React.ComponentProps<"input">,
  "checked" | "onChange" | "size" | "className" | "style"
> {
  /**
   * Controlled state — the parent owns it and must update it via `onChange`.
   * Omit for an uncontrolled switch.
   *
   * @zh 受控状态（"off" | "on" | "indeterminate"）；与 `onChange` 搭配使用。
   */
  value?: SwitchState;
  /**
   * Initial state for an uncontrolled switch. Ignored once `value` is set.
   *
   * @zh 非受控开关的初始状态；一旦设置了 `value` 便忽略。
   */
  defaultValue?: SwitchState;
  /**
   * Fires with the next state on every user toggle (pointer, keyboard, label).
   *
   * @zh 每次用户切换（指针、键盘、标签）时以下一状态触发。
   */
  onChange?: (state: SwitchState) => void;
  /**
   * Track-height scale via `controlSize`; the width and thumb scale with it.
   * Every size, `md` included, grows below the `md` breakpoint like the
   * `controlSize` scale.
   *
   * @zh 基于 `controlSize` 的轨道高度阶梯；宽度与滑块随之缩放。
   */
  size?: "sm" | "md" | "lg";
  /**
   * Motion on the track when the switch turns on. `"sweep"` floods the
   * accent fill out from the point the pointer released, or from the thumb,
   * and as the flood reaches the track's edge a ring light runs once around
   * it on the effect layer. Without an `EffectLayerProvider` or WebGPU, only
   * the flood runs; under reduced motion, neither does.
   *
   * @zh 开关打开时轨道上的动效。`"sweep"` 让强调色从指针松开处或滑块处涌出填满轨道，涌到边缘时一道环形光在效果层上沿轨道跑一圈。没有 `EffectLayerProvider` 或 WebGPU 时只有涌出的填充；减少动态效果时两者都不播放。
   */
  effect?: "sweep";
  /**
   * StyleX styles merged over the switch's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在开关自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
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
  effect,
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

  const sweepRef = useSweep();
  // The Sweep flood in flight: where it starts, or `"pending"` while a drag
  // holds it back until the thumb is released.
  const [sweep, setSweep] = useState<SweepOrigin | "pending" | null>(null);
  const dispatchedSweepRef = useRef<SweepOrigin | null>(null);

  function thumbCentre(rect: DOMRect): SweepPoint {
    const x = value === "indeterminate" ? rect.height : rect.height / 2;
    return { x, y: rect.height / 2 };
  }

  function setControlledValue(
    newValue: SwitchState,
    from?: SweepPoint | "pending",
  ) {
    if (effect === "sweep" && elRef.current) {
      if (newValue !== "on") {
        setSweep(null);
      } else if (from === "pending") {
        setSweep("pending");
      } else if (value !== "on" || sweep === "pending") {
        const rect = elRef.current.getBoundingClientRect();
        setSweep(sweepOrigin(rect, from ?? thumbCentre(rect)));
      }
    }
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

  useEffect(() => {
    const element = elRef.current;
    if (
      effect !== "sweep" ||
      value !== "on" ||
      sweep === null ||
      sweep === "pending" ||
      dispatchedSweepRef.current === sweep ||
      !element
    ) {
      return;
    }
    dispatchedSweepRef.current = sweep;
    const rect = element.getBoundingClientRect();
    dispatchSweep(element, {
      clientX: rect.left + sweep.x,
      clientY: rect.top + sweep.y,
    });
  }, [effect, value, sweep]);

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

  const setInputRef = mergeRefs(
    elRef,
    forwardedRef,
    effect === "sweep" ? sweepRef : undefined,
    (node) => {
      if (node && !hasSetInitialRenderedRef.current) {
        hasSetInitialRenderedRef.current = true;
        setInitialRendered(true);
      }
    },
  );

  return (
    <input
      ref={setInputRef}
      {...rest}
      css={[
        buttonReset.base,
        corner.radius_round,
        styles.switch,
        sizeStyles[size],
        initialRendered && styles.animate,
        isDragging && styles.dragging(position),
        effect === "sweep" && styles.sweep,
        effect === "sweep" && sweep !== null && styles.sweepCover,
        effect === "sweep" &&
          sweep !== null &&
          sweep !== "pending" &&
          styles.sweepFlood(sweep.x, sweep.y, sweep.reach),
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
  setControlledValue: (
    next: SwitchState,
    from?: SweepPoint | "pending",
  ) => void;
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
      // A Sweep starts from where the thumb is released, so a drag holds
      // it back until then.
      setControlledValue(newState, "pending");
    }
  }

  function handleDragEnd(e: React.PointerEvent<HTMLInputElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) {
      return;
    }

    // This pointer interaction owns the toggle, so the trailing `click` (see
    // `onClick`) must not repeat it.
    toggleHandledRef.current = true;

    const rect = initialRectRef.current;
    if (isDragging) {
      if (elRef.current && rect) {
        if (elRef.current.indeterminate) {
          elRef.current.indeterminate = false;
        }

        const midPoint = rect.left + rect.width / 2;
        const newState = lastClientXRef.current > midPoint ? "on" : "off";
        const halfHeight = rect.height / 2;
        setControlledValue(newState, {
          x: Math.max(
            halfHeight,
            Math.min(rect.width - halfHeight, e.clientX - rect.left),
          ),
          y: halfHeight,
        });
      }
    } else {
      setControlledValue(
        value === "on" ? "off" : "on",
        rect
          ? { x: e.clientX - rect.left, y: e.clientY - rect.top }
          : undefined,
      );
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
      default: color.bgControlStrong,
      ":checked": color.bgAccent,
    },
    boxShadow: {
      default: shadow._2,
      ":hover": {
        default: null,
        [pointer.canHover]: { "::before": shadow._3 },
      },
    },
    touchAction: "none",

    [switchTokens.thumbPosition]: {
      default: 0,
      ":checked": switchTokens.trackHeight,
      ":indeterminate": `calc(${switchTokens.trackHeight} / 2)`,
    },
    [switchTokens.thumbShadow]: {
      default: null,
      ":hover": { default: null, [pointer.canHover]: shadow._3 },
    },

    "::before": {
      backgroundColor: color.fgOnAccent,
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
  // With Sweep, the track takes the accent at once and a cover of the off
  // colour over it opens out from the origin, so the fill floods instead of
  // crossfading. Turning off keeps the crossfade. Under reduced motion the
  // switch keeps its crossfade both ways: a media query outranks a
  // pseudo-class in StyleX, so it needs no nesting.
  sweep: {
    transition: {
      default: `background-color ${duration._200} ${easing.ease}`,
      ":checked": "none",
      [motionConstants.REDUCED_MOTION]: `background-color ${duration._200} ${easing.ease}`,
    },
  },
  sweepCover: {
    backgroundImage: {
      default: null,
      ":checked": `radial-gradient(circle at ${switchTokens.sweepX} ${switchTokens.sweepY}, transparent calc(${switchTokens.sweepReach} * ${switchTokens.sweepProgress} - 0.5px), ${color.bgControlStrong} calc(${switchTokens.sweepReach} * ${switchTokens.sweepProgress} + 0.5px))`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  sweepFlood: (x: number, y: number, reach: number) => ({
    [switchTokens.sweepX]: `${String(x)}px`,
    [switchTokens.sweepY]: `${String(y)}px`,
    [switchTokens.sweepReach]: `${String(reach)}px`,
    animationName: {
      default: null,
      ":checked": floodKeyframes,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    animationDuration: sweepConsts.floodDuration,
    animationTimingFunction: sweepConsts.floodEasing,
    animationFillMode: "forwards",
  }),
});

const floodKeyframes = stylex.keyframes({
  from: { [switchTokens.sweepProgress]: 0 },
  to: { [switchTokens.sweepProgress]: 1 },
});

/** A point in the track's own space, in CSS px from its top-left corner. */
interface SweepPoint {
  readonly x: number;
  readonly y: number;
}

/** Where a Sweep flood starts, and how far it travels to cover the track. */
interface SweepOrigin extends SweepPoint {
  readonly reach: number;
}

function sweepOrigin(rect: DOMRect, point: SweepPoint): SweepOrigin {
  const x = Math.max(0, Math.min(rect.width, point.x));
  const y = Math.max(0, Math.min(rect.height, point.y));
  const box = {
    width: rect.width,
    height: rect.height,
    radius: rect.height / 2,
  };
  return { x, y, reach: floodReach(box, x, y) };
}

// Each size sets the `switchTokens.trackHeight` knob; `styles.switch` derives
// height, width, thumb size, and travel from it. `md` reproduces the historic
// default, so omitting `size` stays pixel-identical.
const sizeStyles = stylex.create({
  sm: { [switchTokens.trackHeight]: controlSize._8 },
  md: { [switchTokens.trackHeight]: controlSize._9 },
  lg: { [switchTokens.trackHeight]: controlSize._10 },
});

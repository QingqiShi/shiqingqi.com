"use client";

import * as stylex from "@stylexjs/stylex";
import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { useLiquid } from "../effect-layer/use-liquid.ts";
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

/** Where the thumb rests for each state, as a share of the track's travel. */
const THUMB_POSITION: Record<SwitchState, number> = {
  off: 0,
  indeterminate: 0.5,
  on: 1,
};

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
   * An effect the effect layer draws in place of the thumb. `"liquid"`, the
   * default, draws the thumb as a frozen drop of frosted ice, which thaws
   * into water when it is pressed or toggled: it pours across the track,
   * lands on the far end, sloshes to rest and freezes again. The beads it
   * sheds on the way drift after it and merge back in.
   * Turning on, the on fill rises through the whole track as a glow from
   * underneath, which stays under the frozen drop; turning off, it sinks
   * away. When the drop lands on the on end a ring light runs once around
   * the track from where it lands: a press above or below the middle of
   * the track aims the drop a little that way, so it lands higher or lower.
   * A drag moves it with inertia, and the glow follows how far it has gone.
   * Under reduced motion the thumb goes straight to its place, the fill
   * changes at once and a still glow marks turning on. `"none"` keeps the
   * plain thumb and track. The effect draws only inside an
   * `EffectLayerProvider` with WebGPU; elsewhere, and under forced colours,
   * the switch looks and works as it does with `"none"`.
   *
   * @zh 由效果层代替滑块绘制的效果。默认的 `"liquid"` 把滑块画成一滴结霜的冰，按下或切换时它融化成水：涌过轨道，撞上远端后晃动至静止，再重新冻结。沿途甩下的水珠随惯性追上它，重新并入其中。打开时，开启的填充色化作一团从下方透出的光，在整条轨道上亮起，并留在冻结的水滴下方；关闭时，这团光渐渐沉下去。水滴落到开启端时，一道环形光从落点出发沿轨道跑一圈：按在轨道中线以上或以下，水滴会略微偏向那一侧，落点也随之偏上或偏下。拖动时它带着惯性跟随，光随它走过的距离变化。减少动态效果时滑块直接到位，填充色立即切换，打开时只亮起一圈静止的微光。`"none"` 保留普通的滑块与轨道。效果只在带有 WebGPU 的 `EffectLayerProvider` 之内绘制；在其它情况下以及强制颜色模式下，开关的外观与行为与 `"none"` 相同。
   */
  effect?: "liquid" | "none";
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
  effect = "liquid",
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

  const [pressAim, setPressAim] = useState(0);

  function setControlledValue(newValue: SwitchState, aim = 0) {
    setPressAim(aim);
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
    isPressed,
    isDragging,
    position,
    travel,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  } = useSwitchDrag({
    elRef,
    toggleHandledRef,
    value,
    disabled: rest.disabled,
    setControlledValue,
  });

  const liquidRef = useLiquid({
    position: THUMB_POSITION[value],
    drag:
      isDragging && position !== null && travel > 0 ? position / travel : null,
    pressed: isPressed,
    aim: pressAim,
  });

  // Enables animation only after mount, so a route or locale change does not
  // animate the switch.
  const [initialRendered, setInitialRendered] = useState(false);

  const markInitialRendered = useCallback((node: HTMLInputElement | null) => {
    if (node && !hasSetInitialRenderedRef.current) {
      hasSetInitialRenderedRef.current = true;
      setInitialRendered(true);
    }
  }, []);
  // A new ref callback detaches and attaches again, which registers the
  // element on the effect layer afresh, so the merged ref holds still.
  const effectRef = effect === "liquid" ? liquidRef : undefined;
  const setInputRef = useMemo(
    () => mergeRefs(elRef, forwardedRef, effectRef, markInitialRendered),
    [forwardedRef, effectRef, markInitialRendered],
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
        effect === "liquid" && styles.otherFill,
        css,
      ]}
      role="switch"
      type="checkbox"
      onPointerDown={handleDragStart}
      onPointerUp={handleDragEnd}
      onPointerMove={handleDragMove}
      onPointerCancel={handleDragCancel}
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

/** Where `clientY` is across the track, from -1 at its top to 1 at its bottom. */
function aimAt(rect: DOMRect, clientY: number) {
  const half = rect.height / 2;
  if (half <= 0) {
    return 0;
  }
  return Math.max(-1, Math.min(1, (clientY - rect.top - half) / half));
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
  setControlledValue: (next: SwitchState, aim?: number) => void;
}) {
  const initialRectRef = useRef<DOMRect | null>(null);
  const initialClientXRef = useRef(0);
  const lastClientXRef = useRef(0);
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [travel, setTravel] = useState(0);

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
    setIsPressed(true);

    elRef.current.setPointerCapture(e.pointerId);
  }

  function handleDragCancel() {
    setIsPressed(false);
    setIsDragging(false);
    setPosition(null);
    initialRectRef.current = null;
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
    setTravel(rect.width - rect.height);

    const midPoint = rect.left + rect.width / 2;
    const newState = lastClientXRef.current > midPoint ? "on" : "off";
    if (newState !== value) {
      setControlledValue(newState);
    }
  }

  function handleDragEnd(e: React.PointerEvent<HTMLInputElement>) {
    // A disabled input still gets `pointerup`, and a press that starts
    // outside the Switch can end on it. Toggle only after a press that
    // started on the Switch.
    const rect = initialRectRef.current;
    if (rect === null || (e.pointerType === "mouse" && e.button !== 0)) {
      return;
    }

    // This pointer interaction owns the toggle, so the trailing `click` (see
    // `onClick`) must not repeat it.
    toggleHandledRef.current = true;

    if (isDragging) {
      if (elRef.current) {
        if (elRef.current.indeterminate) {
          elRef.current.indeterminate = false;
        }

        const midPoint = rect.left + rect.width / 2;
        const newState = lastClientXRef.current > midPoint ? "on" : "off";
        setControlledValue(newState, aimAt(rect, e.clientY));
      }
    } else {
      setControlledValue(value === "on" ? "off" : "on", aimAt(rect, e.clientY));
    }

    elRef.current?.releasePointerCapture(e.pointerId);
    handleDragCancel();
  }

  return {
    isPressed,
    isDragging,
    position,
    travel,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  };
}

/** The effect layer sets this attribute while it draws the thumb. */
const DRAWN_BY_EFFECT = ":is([data-effect-drawn])";

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
    // The fill changes at once while the effect draws the thumb: the effect
    // covers the track and lets the new fill rise or sink as a glow.
    transition: {
      default: `background-color ${duration._200} ${easing.ease}`,
      [DRAWN_BY_EFFECT]: "none",
    },
    backgroundColor: {
      default: color.bgControlStrong,
      ":checked": color.bgAccent,
    },
    boxShadow: shadow._2,
    touchAction: "none",

    [switchTokens.thumbPosition]: {
      default: 0,
      ":checked": switchTokens.trackHeight,
      ":indeterminate": `calc(${switchTokens.trackHeight} / 2)`,
    },
    [switchTokens.thumbShadow]: {
      default: null,
      [pointer.canHover]: {
        default: null,
        ":hover": shadow._3,
        ":disabled:hover": "none",
      },
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
      // The thumb keeps its box, its colour and its position while the
      // effect draws in its place, so the effect can read them from it.
      visibility: {
        default: null,
        [DRAWN_BY_EFFECT]: "hidden",
      },
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
  // The effect reads the fill the track takes on a toggle from here, so a
  // drag can change the fill before the toggle. It is the text colour of the
  // `::after`, not its background: on a coarse pointer, `buttonReset` makes
  // the `::after` the touch target, and a background there covers the
  // track. The `::after` has no text, so this colour does not show.
  otherFill: {
    "::after": {
      color: {
        default: color.bgAccent,
        ":checked": color.bgControlStrong,
      },
    },
  },
});

// Each size sets the `switchTokens.trackHeight` knob; `styles.switch` derives
// height, width, thumb size, and travel from it. `md` reproduces the historic
// default, so omitting `size` stays pixel-identical.
const sizeStyles = stylex.create({
  sm: { [switchTokens.trackHeight]: controlSize._8 },
  md: { [switchTokens.trackHeight]: controlSize._9 },
  lg: { [switchTokens.trackHeight]: controlSize._10 },
});

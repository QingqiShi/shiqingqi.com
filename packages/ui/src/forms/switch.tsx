"use client";

import * as stylex from "@stylexjs/stylex";
import React, { useLayoutEffect, useRef, useState } from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { handBack } from "../effect-layer/hand-back.stylex.ts";
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
import { typeRole } from "../primitives/type.stylex.ts";
import {
  border,
  controlHeight,
  controlSize,
  layer,
  opacity,
  ratio,
  shadow,
} from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { fieldStyles } from "./field-shared.stylex.ts";
import { DRAG_THRESHOLD, indexAt } from "./index-at.ts";
import { selectedSurface } from "./segment-track.stylex.ts";
import { switchTokens } from "./switch.stylex.ts";
import { useFieldAria } from "./use-field-aria.ts";

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
   * The setting's name. The switch leads and the name follows it, so the two
   * read as one setting with no box around them, at every width. A click on
   * the name toggles the switch. Without a `label`, the switch renders alone
   * and takes an `aria-label`.
   *
   * @zh 设置项的名称。开关在前，名称紧随其后，二者无需外框即可读作同一个设置项，在任何宽度下都是如此。点击名称也会切换开关。没有 `label` 时只渲染开关本身，并需要 `aria-label`。
   */
  label?: string;
  /**
   * What the setting changes, under the name and aligned with it, wired via
   * `aria-describedby`. Shows only with a `label`.
   *
   * @zh 说明这个设置会改变什么，位于名称下方并与名称对齐，通过 `aria-describedby` 关联。仅在有 `label` 时显示。
   */
  description?: string;
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
   * Track-height scale via `controlHeight`; the width and thumb scale with
   * it. Every size, `md` included, grows below the `md` breakpoint like the
   * `controlHeight` scale. Defaults to `"xs"` with a `label`, else `"md"`.
   *
   * @zh 基于 `controlHeight` 的轨道高度阶梯；宽度与滑块随之缩放。有 `label` 时默认为 `"xs"`，否则为 `"md"`。
   */
  size?: "xs" | "sm" | "md" | "lg";
  /**
   * An effect the effect layer draws on the thumb. `"liquid"`, the default,
   * keeps the plain solid thumb at rest. While a pointer is over the switch,
   * a light comes in above the thumb and lights its top edge, leaning towards
   * the pointer, and it goes when the pointer leaves. When the switch is
   * pressed or toggled, the effect draws the thumb as liquid: it melts into
   * water, which pours across the track, sheds drops on its way and sloshes
   * against the far end. It flows on for a moment while the drops catch up
   * and merge into it, then sets into the solid thumb again.
   * Turning on, the on fill rises through the track, ahead under the thumb;
   * turning off, it sinks away. A drag moves the liquid with inertia, and
   * the fill follows how far it has gone. Under reduced motion the thumb
   * crossfades to its place, the fill changes at once, and the light shows at
   * once and does not follow the pointer. `"none"` keeps the plain thumb and
   * track. The effect draws only inside an
   * `EffectLayerProvider` with WebGPU; elsewhere, and under forced colours,
   * the switch looks and works as it does with `"none"`.
   *
   * @zh 由效果层在滑块上绘制的效果。默认的 `"liquid"` 在静止时保留普通的实心滑块。指针停在开关上时，光从滑块上方照亮它的上缘，并偏向指针；指针离开后光随之消失。按下或切换开关时，由效果把滑块绘制成液体：它融化成水，涌过轨道，途中甩出水珠，在远端来回晃动。它继续流动片刻，水珠追上并融入其中，然后重新凝固成实心滑块。打开时，开启的填充色在整条轨道上升起，在滑块下方领先一步；关闭时，它渐渐退去。拖动时液体带着惯性跟随，填充色随它走过的距离变化。减少动态效果时，滑块以交叉淡入淡出到位，填充色立即切换，光立即出现，也不跟随指针。`"none"` 保留普通的滑块与轨道。效果只在带有 WebGPU 的 `EffectLayerProvider` 之内绘制；在其它情况下以及强制颜色模式下，开关的外观与行为与 `"none"` 相同。
   */
  effect?: "liquid" | "none";
  /**
   * StyleX styles merged over the root's own, which is the field with a
   * `label` and the switch without one — the config-layer escape hatch.
   *
   * @zh 合并在根元素自身样式之上的 StyleX 样式（有 `label` 时根元素是整个字段，否则是开关本身）——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * A three-state toggle (`off` / `on` / `indeterminate`) that supports pointer
 * drag, keyboard, and click activation, controlled or uncontrolled.
 *
 * Renders as `<input role="switch">`, so it needs an accessible name: pass
 * `label`, which also lays out the setting, or `aria-label` where the words
 * around it already say what it does.
 */
export function Switch({
  label,
  description,
  value: valueProp,
  defaultValue,
  onChange,
  size: sizeProp,
  effect = "liquid",
  css,
  id,
  "aria-describedby": ariaDescribedBy,
  ref: forwardedRef,
  ...rest
}: SwitchProps) {
  const bare = label === undefined;
  const { fieldId, descriptionId, hasDescription, describedBy } = useFieldAria({
    id,
    ariaDescribedBy,
    description: bare ? undefined : description,
  });
  const size = sizeProp ?? (bare ? "md" : "xs");
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
    isPressed,
    drag,
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
    drag,
    pressed: isPressed,
  });

  // Enables animation only after mount, so a route or locale change does not
  // animate the switch.
  const [initialRendered, setInitialRendered] = useState(false);

  const markInitialRendered = (node: HTMLInputElement | null) => {
    if (node && !hasSetInitialRenderedRef.current) {
      hasSetInitialRenderedRef.current = true;
      setInitialRendered(true);
    }
  };
  const effectRef = effect === "liquid" ? liquidRef : undefined;
  const setInputRef = mergeRefs(
    elRef,
    forwardedRef,
    effectRef,
    markInitialRendered,
  );

  const input = (
    <input
      ref={setInputRef}
      {...rest}
      id={fieldId}
      aria-describedby={describedBy}
      css={[
        buttonReset.base,
        corner.radius_round,
        styles.switch,
        sizeStyles[size],
        initialRendered && styles.animate,
        drag !== null && styles.dragging(drag),
        effect === "liquid" && styles.otherFill,
        bare && css,
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
      onClick={(e) => {
        if (toggleHandledRef.current) {
          e.preventDefault();
          toggleHandledRef.current = false;
          return;
        }
        // With no preceding toggle, this click came from an associated
        // `<label>`. Do not cancel the click: the browser would restore the
        // old `checked` after the layout effect set the new one. Put the DOM
        // back to the current state instead, because a parent can update the
        // state later or not at all.
        if (rest.disabled) {
          e.preventDefault();
          return;
        }
        e.currentTarget.checked = value === "on";
        e.currentTarget.indeterminate = value === "indeterminate";
        setControlledValue(value === "on" ? "off" : "on");
      }}
    />
  );

  if (bare) {
    return input;
  }

  return (
    <div css={[fieldStyles.root, styles.field, css]}>
      {input}
      <label
        htmlFor={fieldId}
        css={[
          typeRole.control,
          styles.label,
          rest.disabled && styles.labelDisabled,
        ]}
      >
        {label}
      </label>
      {hasDescription ? (
        <span
          id={descriptionId}
          css={[
            typeRole.bodySmall,
            fieldStyles.description,
            styles.description,
          ]}
        >
          {description}
        </span>
      ) : null}
    </div>
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
  const [isPressed, setIsPressed] = useState(false);
  /** Where a drag holds the thumb, as a share of the travel. */
  const [drag, setDrag] = useState<number | null>(null);

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
    setDrag(null);
    initialRectRef.current = null;
  }

  function handleDragMove(e: React.PointerEvent<HTMLInputElement>) {
    const rect = initialRectRef.current;
    const clientX = initialClientXRef.current;
    if (!rect) {
      return;
    }

    if (drag === null && Math.abs(e.clientX - clientX) < DRAG_THRESHOLD) {
      return;
    }

    lastClientXRef.current = e.clientX;
    setDrag(
      indexAt(
        [rect.left + rect.height / 2, rect.right - rect.height / 2],
        e.clientX,
      ),
    );

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

    if (drag !== null) {
      if (elRef.current) {
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
    handleDragCancel();
  }

  return {
    isPressed,
    drag,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  };
}

/** The effect layer sets this attribute while it draws the thumb. */
const DRAWN_BY_EFFECT = ":is([data-effect-drawn])";

const styles = stylex.create({
  field: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "center",
    columnGap: controlSize._3,
  },
  label: {
    justifySelf: "start",
    color: color.fg,
    cursor: "pointer",
  },
  labelDisabled: {
    cursor: "not-allowed",
  },
  description: {
    gridColumn: 2,
  },
  switch: {
    margin: 0,
    flexShrink: 0,
    aspectRatio: ratio.double,
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": opacity.disabled },
    display: "flex",
    height: switchTokens.trackHeight,
    padding: border.size_2,
    position: "relative",
    // The fill changes at once while the effect draws the thumb: the effect
    // covers the track and draws the new fill as it rises or sinks.
    transition: {
      default: `background-color ${duration._200} ${easing.ease}, box-shadow ${duration._200} ${easing.ease}`,
      [DRAWN_BY_EFFECT]: "none",
    },
    backgroundColor: {
      default: color.bgControlStrong,
      ":checked": color.bgControlStrongSelected,
    },
    // The ring inside the edge belongs to the off track. It fades out as the
    // track turns on, while the fill changes.
    boxShadow: {
      default: `inset 0 0 0 ${border.size_1} ${color.borderControlStrong}, ${shadow._2}`,
      ":checked": `inset 0 0 0 ${border.size_1} transparent, ${shadow._2}`,
    },
    touchAction: "none",

    [switchTokens.thumbPosition]: {
      default: 0,
      ":checked": switchTokens.trackHeight,
      ":indeterminate": `calc(${switchTokens.trackHeight} / 2)`,
    },
    [switchTokens.thumbShadow]: {
      default: selectedSurface.thumbShadow,
      [pointer.canHover]: {
        default: selectedSurface.thumbShadow,
        ":hover": selectedSurface.thumbShadowHover,
        ":disabled:hover": "none",
      },
    },

    "::before": {
      backgroundColor: color.fgOnControlStrong,
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
      // effect draws in its place, so the effect can read them from it. It
      // hides at once when the effect takes over, and fades back in as the
      // effect hands it back.
      opacity: {
        default: 1,
        [DRAWN_BY_EFFECT]: 0,
      },
    },
  },
  animate: {
    "::before": {
      transition: {
        default: `transform ${switchTokens.thumbTransitionDuration} ${easing.spring}, box-shadow ${duration._400} ${easing.ease}, opacity ${handBack.duration} ${easing.linear}`,
        [DRAWN_BY_EFFECT]: "none",
        [motionConstants.REDUCED_MOTION]: `box-shadow ${duration._400} ${easing.ease}`,
      },
    },
  },
  dragging: (drag: number) => ({
    [switchTokens.thumbPosition]: `calc(${String(drag)} * ${switchTokens.trackHeight})`,
    "::before": {
      transition: null,
    },
  }),
  // The effect reads the fill the track takes on a toggle from here, so a
  // drag can change the fill before the toggle. It is the text colour of the
  // `::after`, not its background: on a coarse pointer, `buttonReset` makes
  // the `::after` the touch target, and a background there covers the
  // track. The `::after` has no text, so this colour does not show. The
  // ring inside the edge that the track takes is its border colour, which
  // does not show, because the `::after` has no border.
  otherFill: {
    "::after": {
      color: {
        default: color.bgControlStrongSelected,
        ":checked": color.bgControlStrong,
      },
      borderColor: {
        default: "transparent",
        ":checked": color.borderControlStrong,
      },
    },
  },
});

// Each size sets the `switchTokens.trackHeight` knob; `styles.switch` derives
// height, width, thumb size, and travel from it.
const sizeStyles = stylex.create({
  xs: { [switchTokens.trackHeight]: controlHeight.xs },
  sm: { [switchTokens.trackHeight]: controlHeight.sm },
  md: { [switchTokens.trackHeight]: controlHeight.md },
  lg: { [switchTokens.trackHeight]: controlHeight.lg },
});

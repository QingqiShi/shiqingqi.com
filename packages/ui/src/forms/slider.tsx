"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { handBack } from "../effect-layer/hand-back.stylex.ts";
import { LIQUID_FILL, LIQUID_THUMB } from "../effect-layer/liquid-indicator.ts";
import { useLiquid } from "../effect-layer/use-liquid.ts";
import { useControlled } from "../hooks/use-controlled.ts";
import { mergeRefs } from "../merge-refs.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { flex } from "../primitives/flex.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { typeModifier, typeRole } from "../primitives/type.stylex.ts";
import { controlSize, opacity, rhythm } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { fieldStyles } from "./field-shared.stylex.ts";
import { selectedSurface } from "./segment-track.stylex.ts";
import { sliderTokens } from "./slider.stylex.ts";
import { useFieldAria } from "./use-field-aria.ts";
import { useSliderThumb } from "./use-slider-thumb.ts";

// The design system's `size` scale replaces the native character-width attribute of the same name.
interface SliderOwnProps extends Omit<
  ComponentProps<"input">,
  | "type"
  | "size"
  | "min"
  | "max"
  | "step"
  | "value"
  | "defaultValue"
  | "onChange"
  | "children"
  | "className"
  | "style"
> {
  /**
   * Visible label text, and the control's accessible name — it lands on the
   * `<input>` itself via `htmlFor`, never on a wrapper. Required even when
   * hidden via {@link SliderProps.labelHidden}.
   *
   * @zh 可见的标签文本，也是控件的无障碍名称——通过 `htmlFor` 落在 `<input>` 本身上，而非外层容器。即使通过 `labelHidden` 隐藏，仍必须提供。
   */
  label: string;
  /**
   * Visually hide the label (kept in the accessibility tree via `sr-only`).
   *
   * @zh 在视觉上隐藏标签（通过 `sr-only` 保留在无障碍树中）。
   */
  labelHidden?: boolean;
  /**
   * Helper text rendered under the label and wired via `aria-describedby`.
   *
   * @zh 标签下方的说明文字，通过 `aria-describedby` 关联到输入框。
   */
  description?: string;
  /**
   * Error message. Turns the filled part of the track danger-coloured, sets
   * `aria-invalid`, renders with `role="alert"`, and joins `aria-describedby`.
   *
   * @zh 错误消息。把轨道的已填充部分变为危险色，设置 `aria-invalid`，以 `role="alert"` 渲染，并加入 `aria-describedby`。
   */
  error?: string;
  /**
   * Live value display rendered opposite the label. Formatting is the
   * consumer's — the Slider only places it.
   *
   * @zh 渲染在标签对面的实时数值。格式化由调用方决定——滑块只负责摆放。
   */
  readout?: ReactNode;
  /**
   * Lower bound of the range, and where an uncontrolled Slider with no
   * `defaultValue` starts.
   *
   * @zh 范围的下界；未设置 `defaultValue` 的非受控滑块也从这里开始。
   */
  min?: number;
  /**
   * Upper bound of the range.
   *
   * @zh 范围的上界。
   */
  max?: number;
  /**
   * Granularity of each step, for the pointer and for the arrow keys alike.
   *
   * @zh 每一步的粒度，指针与方向键同样适用。
   */
  step?: number;
  /**
   * Fires once when an interaction that moved the value ends — pointer release,
   * key release, or losing focus mid-gesture.
   *
   * @zh 当一次改变了数值的交互结束时触发一次——松开指针、松开按键，或在手势中途失去焦点。
   */
  onCommit?: (value: number) => void;
  /**
   * Height of the track, on the `controlSize` scale. The thumb sits inside
   * the track and is as tall as it, less a thin rim.
   *
   * @zh 轨道的高度，取自 `controlSize` 阶梯。滑块嵌在轨道之内，与轨道等高，只留一圈细边。
   */
  size?: "sm" | "md" | "lg";
  /**
   * An effect the effect layer draws on the thumb. `"liquid"`, the default,
   * keeps the plain solid thumb at rest. While a pointer is over the track,
   * a light comes in on the top edge of the thumb. While a pointer holds the
   * thumb, the effect draws it as clear liquid: it swells a little past the
   * track, and the track and the end of the fill show through it, bent. It
   * follows the pointer with its own inertia, and sets into the solid thumb
   * again after the release. A key moves the solid thumb and does not melt
   * it. `"none"` keeps the plain thumb. The effect draws only inside an
   * `EffectLayerProvider` with WebGPU and without reduced motion; elsewhere
   * the thumb stays solid, and widens a little under a press.
   *
   * @zh 由效果层在滑块上绘制的效果。默认的 `"liquid"` 在静止时保留普通的实心滑块。指针停在轨道上时，光照亮滑块的上缘。指针按住滑块时，由效果把它绘制成透明的液体：它略微鼓出轨道，轨道与填充的末端透过它折射出来；它带着惯性跟随指针，松开后重新凝固成实心滑块。按键只移动实心滑块，不会让它融化。`"none"` 保留普通的滑块。效果只在带有 WebGPU 的 `EffectLayerProvider` 之内、且未开启减少动态效果时绘制；在其它情况下滑块保持实心，按下时略微变宽。
   */
  effect?: "liquid" | "none";
  /**
   * StyleX styles merged over the root wrapper — the escape hatch.
   *
   * @zh 合并到根容器上的 StyleX 样式——逃生舱口。
   */
  css?: StyleProp;
}

/**
 * A controlled value without `onChange` is a dead control: `useControlled`
 * returns a no-op setter, so the thumb springs back the moment it is released.
 */
type SliderValueProps =
  | {
      /**
       * Controlled value. Requires `onChange` — without it, the thumb
       * springs back to its current value the moment it is released.
       *
       * @zh 受控数值，需同时提供 `onChange`——否则滑块在松开的瞬间就会弹回原值。
       */
      value: number;
      /**
       * Fires with the next number on every value change, including each
       * move of a drag.
       *
       * @zh 每次数值变化时以新数值触发，拖动过程中的每一次移动也包含在内。
       */
      onChange: (value: number) => void;
      defaultValue?: undefined;
    }
  | {
      value?: undefined;
      /**
       * Fires with the next number on every value change, including each
       * move of a drag.
       *
       * @zh 每次数值变化时以新数值触发，拖动过程中的每一次移动也包含在内。
       */
      onChange?: (value: number) => void;
      /**
       * Starting value for an uncontrolled Slider. Cannot be combined with
       * `value`.
       *
       * @default min
       * @zh 非受控滑块的起始数值，不能与 `value` 同时使用。
       */
      defaultValue?: number;
    };

type SliderProps = SliderOwnProps & SliderValueProps;

/**
 * Single-value slider. The track is a groove, the thumb is a pill as tall as
 * the groove that moves inside it, and a neutral bar fills the groove from
 * its start to the middle of the thumb. A native
 * `<input type="range">` holds the value, so keyboard stepping, focus, value
 * announcement and form submission come from the platform. `onChange`
 * streams every move; `onCommit` fires once per interaction.
 */
export function Slider({
  label,
  labelHidden,
  description,
  error,
  readout,
  value: valueProp,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onCommit,
  size = "md",
  effect = "liquid",
  css,
  id,
  disabled,
  onKeyDown,
  onKeyUp,
  onBlur,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ref,
  ...rest
}: SliderProps) {
  const [value, setValue] = useControlled({
    controlled: valueProp,
    defaultValue: defaultValue ?? min,
  });

  const pendingCommitRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // A press on the track gives the input the focus from script, and a
  // browser can show the focus ring for that. As with a native control, the
  // ring shows only when the focus or the last change came from the keyboard.
  const [isPointerFocus, setIsPointerFocus] = useState(false);

  const {
    fieldId,
    descriptionId,
    errorId,
    hasDescription,
    hasError,
    describedBy,
    ariaInvalid: resolvedAriaInvalid,
  } = useFieldAria({ id, ariaDescribedBy, ariaInvalid, description, error });

  function commit() {
    const pending = pendingCommitRef.current;
    if (pending === null) {
      return;
    }
    pendingCommitRef.current = null;
    onCommit?.(pending);
  }

  const {
    share,
    carrierRef,
    fillRef,
    thumbRef,
    heldAt,
    isReversed,
    directionRef,
    change,
    trackHandlers,
  } = useSliderThumb({
    value,
    min,
    max,
    step,
    disabled: disabled === true,
    onPress: () => {
      setIsPointerFocus(true);
      inputRef.current?.focus({ preventScroll: true });
    },
    onChange: (next) => {
      pendingCommitRef.current = next;
      setValue(next);
      onChange?.(next);
    },
    onRelease: commit,
  });
  // The liquid reads a right-to-left track from its right end.
  const liquidRef = useLiquid({
    position: isReversed ? 1 - share : share,
    drag: heldAt !== null && isReversed ? 1 - heldAt : heldAt,
    pressed: heldAt !== null,
  });

  return (
    <div css={[stack.tight, fieldStyles.root, css]}>
      <div
        css={[
          stack.text,
          labelHidden &&
            readout === undefined &&
            !hasDescription &&
            a11y.srOnly,
        ]}
      >
        <div
          css={[
            flex.between,
            styles.labelRow,
            labelHidden && readout === undefined && a11y.srOnly,
          ]}
        >
          <label
            htmlFor={fieldId}
            css={[
              typeRole.control,
              fieldStyles.label,
              labelHidden && a11y.srOnly,
            ]}
          >
            {label}
          </label>
          {readout === undefined ? null : (
            <span
              css={[typeRole.control, fieldStyles.label, typeModifier.numeric]}
            >
              {readout}
            </span>
          )}
        </div>
        {hasDescription ? (
          <span
            id={descriptionId}
            css={[typeRole.caption, fieldStyles.description]}
          >
            {description}
          </span>
        ) : null}
      </div>
      <div
        ref={mergeRefs(
          directionRef,
          effect === "liquid" && !disabled ? liquidRef : undefined,
        )}
        css={[
          stylex.defaultMarker(),
          a11y.touchTarget,
          !isPointerFocus && a11y.focusRingWithin,
          corner.radius_round,
          styles.track,
          sizeStyles[size],
          styles.at(share),
          isReversed && styles.reversed,
          hasError && styles.fillInvalid,
          hasError && !isPointerFocus && styles.ringInvalid,
          disabled && styles.trackDisabled,
        ]}
        {...trackHandlers}
        // A press on the track must not take the focus from the input, and
        // must not select text.
        onMouseDown={(event) => {
          event.preventDefault();
        }}
      >
        <div css={[corner.radius_round, styles.clip]}>
          <div ref={fillRef} css={styles.fillCarrier}>
            <div {...{ [LIQUID_FILL]: "" }} css={styles.fill} />
          </div>
        </div>
        <div ref={carrierRef} css={styles.carrier}>
          <div
            ref={thumbRef}
            {...{ [LIQUID_THUMB]: "" }}
            css={[corner.radius_round, styles.thumb]}
          >
            <span css={[corner.radius_round, styles.grip]} />
          </div>
        </div>
        <input
          {...rest}
          ref={mergeRefs(inputRef, ref)}
          id={fieldId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-invalid={resolvedAriaInvalid}
          aria-describedby={describedBy}
          css={[stylex.defaultMarker(), styles.input]}
          onChange={(event) => {
            change(event.currentTarget.valueAsNumber);
          }}
          onKeyDown={(event) => {
            setIsPointerFocus(false);
            onKeyDown?.(event);
          }}
          onKeyUp={(event) => {
            commit();
            onKeyUp?.(event);
          }}
          onBlur={(event) => {
            setIsPointerFocus(false);
            commit();
            onBlur?.(event);
          }}
        />
      </div>
      {hasError ? (
        <span
          id={errorId}
          role="alert"
          css={[typeRole.caption, fieldStyles.errorText]}
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}

const RIM = sliderTokens.rim;
const THUMB_WIDTH = sliderTokens.thumbWidth;

const styles = stylex.create({
  labelRow: {
    gap: rhythm.tight,
  },
  // A groove: the fill of a sunken control, a shade under its top edge and a
  // light under its bottom edge.
  track: {
    position: "relative",
    isolation: "isolate",
    boxSizing: "border-box",
    inlineSize: "100%",
    blockSize: sliderTokens.trackHeight,
    backgroundColor: color.bgControlSunken,
    boxShadow: `inset 0 1px 2px light-dark(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.6)), inset 0 0 0 0.5px light-dark(rgba(0, 0, 0, 0.06), rgba(255, 255, 255, 0.06)), 0 1px 0 light-dark(rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.07))`,
    cursor: "pointer",
    userSelect: "none",
    // A drag along the track moves the thumb, and a swipe across it still
    // scrolls the page.
    touchAction: "pan-y",
    [sliderTokens.thumbWidth]: `calc((${sliderTokens.trackHeight} - 2 * ${RIM}) * 1.6)`,
    [sliderTokens.fillColor]: color.bgControlStrong,
    [sliderTokens.thumbShadow]: {
      default: selectedSurface.thumbShadow,
      [pointer.canHover]: {
        default: selectedSurface.thumbShadow,
        ":hover": selectedSurface.thumbShadowHover,
      },
    },
  },
  at: (share: number) => ({
    [sliderTokens.position]: String(share),
  }),
  // A right-to-left track is the same track, mirrored. Its parts keep the
  // left-to-right layout that their places are written for.
  reversed: {
    scale: "-1 1",
  },
  fillInvalid: {
    [sliderTokens.fillColor]: color.bgDanger,
  },
  ringInvalid: {
    outlineColor: {
      default: "transparent",
      [stylex.when.descendant(":focus-visible")]: color.borderDanger,
      "@supports not selector(:has(*))": {
        default: "transparent",
        ":focus-within": color.borderDanger,
      },
    },
  },
  trackDisabled: {
    cursor: "not-allowed",
    opacity: opacity.disabled,
    [sliderTokens.fillColor]: color.bgNeutral,
    [sliderTokens.thumbShadow]: selectedSurface.thumbShadow,
  },
  // The room of the thumb: the fill is a bar as tall as the thumb, so at the
  // start of the track the thumb hides all of it.
  clip: {
    position: "absolute",
    inset: RIM,
    direction: "ltr",
    overflow: "hidden",
    pointerEvents: "none",
  },
  // Until the motion engine binds, and where no script runs, the fill and the
  // thumb take their places from `sliderTokens.position`. As long as the
  // thumb's travel, so a translate of 100% is the full travel, and its end
  // is under the middle of the thumb.
  fillCarrier: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: `calc(${THUMB_WIDTH} / 2)`,
    inlineSize: `calc(100% - ${THUMB_WIDTH})`,
    translate: `calc((${sliderTokens.position} - 1) * 100%) 0`,
  },
  fill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    left: `calc(${THUMB_WIDTH} / -2)`,
    backgroundColor: sliderTokens.fillColor,
    transition: `background-color ${duration._200} ${easing.ease}`,
  },
  // As long as the thumb's travel, so a translate of 100% is the full travel.
  carrier: {
    position: "absolute",
    top: RIM,
    bottom: RIM,
    left: RIM,
    direction: "ltr",
    inlineSize: `calc(100% - 2 * ${RIM} - ${THUMB_WIDTH})`,
    pointerEvents: "none",
    translate: `calc(${sliderTokens.position} * 100%) 0`,
  },
  // The effect layer marks the track with `data-effect-drawn` while it
  // draws the thumb. The thumb keeps its box and its colour then, so the effect can read them from it. It hides at once when the
  // effect takes over, and fades back in as the effect hands it back.
  thumb: {
    display: "grid",
    placeItems: "center",
    blockSize: "100%",
    inlineSize: THUMB_WIDTH,
    backgroundColor: color.fgOnControlStrong,
    boxShadow: sliderTokens.thumbShadow,
    opacity: {
      default: 1,
      [stylex.when.ancestor(":is([data-effect-drawn])")]: 0,
    },
    transition: {
      default: `box-shadow ${duration._400} ${easing.ease}, opacity ${handBack.duration} ${easing.linear}`,
      [stylex.when.ancestor(":is([data-effect-drawn])")]: "none",
      [motionConstants.REDUCED_MOTION]: `box-shadow ${duration._400} ${easing.ease}`,
    },
  },
  grip: {
    inlineSize: "2px",
    blockSize: "40%",
    backgroundColor: sliderTokens.fillColor,
    opacity: 0.5,
  },
  // The input holds the value, the focus and the keyboard. The track takes
  // the pointer, so the thumb can stay under it between two steps.
  input: {
    position: "absolute",
    inset: 0,
    inlineSize: "100%",
    blockSize: "100%",
    margin: 0,
    appearance: "none",
    opacity: 0,
    pointerEvents: "none",
  },
});

const sizeStyles = stylex.create({
  sm: { [sliderTokens.trackHeight]: controlSize._6 },
  md: { [sliderTokens.trackHeight]: controlSize._7 },
  lg: { [sliderTokens.trackHeight]: controlSize._8 },
});

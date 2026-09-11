"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef, type ComponentProps, type ReactNode } from "react";
import { useControlled } from "../../hooks/use-controlled.ts";
import { useFieldAria } from "../../hooks/use-field-aria.ts";
import { a11y } from "../../primitives/a11y.stylex.ts";
import { corner } from "../../primitives/corner.stylex.ts";
import { flex } from "../../primitives/flex.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../../primitives/motion.stylex.ts";
import {
  border,
  color,
  controlSize,
  opacity,
  shadow,
  space,
} from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { fieldStyles } from "./field-shared.stylex.ts";
import { sliderTokens } from "./slider.stylex.ts";

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
   * Error message. Turns the track danger-coloured, sets `aria-invalid`,
   * renders with `role="alert"`, and joins `aria-describedby`.
   *
   * @zh 错误消息。把轨道变为危险色，设置 `aria-invalid`，以 `role="alert"` 渲染，并加入 `aria-describedby`。
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
   * Track height and thumb diameter, both driven by `controlSize`.
   *
   * @zh 轨道高度与滑块直径，二者都由 `controlSize` 驱动。
   */
  size?: "sm" | "md" | "lg";
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
 * Single-value slider built on a native `<input type="range">`, so keyboard
 * stepping, focus, and value announcement come from the platform. `onChange`
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
  css,
  id,
  disabled,
  onPointerUp,
  onPointerCancel,
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

  const span = max - min;
  const percent =
    span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;

  return (
    <div css={[fieldStyles.root, css]}>
      <div css={[flex.between, styles.labelRow]}>
        <label
          htmlFor={fieldId}
          css={[fieldStyles.label, labelHidden && a11y.srOnly]}
        >
          {label}
        </label>
        {readout === undefined ? null : (
          <span css={[fieldStyles.label, styles.readout]}>{readout}</span>
        )}
      </div>
      {hasDescription ? (
        <span id={descriptionId} css={fieldStyles.description}>
          {description}
        </span>
      ) : null}
      <input
        {...rest}
        ref={ref}
        id={fieldId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-invalid={resolvedAriaInvalid}
        aria-describedby={describedBy}
        // The input is invisible; `corner.radius_round` only shapes the focus
        // ring around the track.
        css={[
          a11y.focusRing,
          corner.radius_round,
          styles.input,
          sizeStyles[size],
          fillStyles.fill(percent),
          hasError && styles.inputInvalid,
          disabled && styles.inputDisabled,
        ]}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          pendingCommitRef.current = next;
          setValue(next);
          onChange?.(next);
        }}
        onPointerUp={(event) => {
          commit();
          onPointerUp?.(event);
        }}
        onPointerCancel={(event) => {
          commit();
          onPointerCancel?.(event);
        }}
        onKeyUp={(event) => {
          commit();
          onKeyUp?.(event);
        }}
        onBlur={(event) => {
          commit();
          onBlur?.(event);
        }}
      />
      {hasError ? (
        <span id={errorId} role="alert" css={fieldStyles.errorText}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

const ACCENT_FILL = `linear-gradient(to right, ${color.accent} ${sliderTokens.fill}, transparent ${sliderTokens.fill})`;
const DANGER_FILL = `linear-gradient(to right, ${color.danger} ${sliderTokens.fill}, transparent ${sliderTokens.fill})`;
const DISABLED_FILL = `linear-gradient(to right, ${color.neutral} ${sliderTokens.fill}, transparent ${sliderTokens.fill})`;

// WebKit stacks the thumb from the track's top edge instead of centring it.
const THUMB_OFFSET = `calc((${sliderTokens.trackHeight} - ${sliderTokens.thumbSize}) / 2)`;
const THUMB_LIFT = `transform ${duration._150} ${easing.easeOut}`;

const styles = stylex.create({
  labelRow: {
    gap: space._2,
  },
  // Composed over `fieldStyles.label`, which it sits opposite in the same row.
  readout: {
    // A live figure that changes on every move must not shift its neighbours.
    fontVariantNumeric: "tabular-nums",
  },
  input: {
    appearance: "none",
    margin: 0,
    padding: 0,
    inlineSize: "100%",
    minInlineSize: 0,
    // Tall enough that the thumb is never clipped by the track.
    blockSize: sliderTokens.thumbSize,
    backgroundColor: "transparent",
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: null, ":disabled": opacity.disabled },

    // The two engines each need their own track and thumb; StyleX takes only
    // literal blocks under a pseudo-element, so the pair is spelled out twice.
    "::-webkit-slider-runnable-track": {
      blockSize: sliderTokens.trackHeight,
      borderRadius: border.radius_round,
      cornerShape: "round",
      // Matches Progress's track. `surfaceNeutralSubtle` hits only 1.04:1
      // against a raised card in dark theme, hiding the unfilled remainder.
      backgroundColor: color.neutralBorder,
      backgroundImage: ACCENT_FILL,
    },
    "::-moz-range-track": {
      blockSize: sliderTokens.trackHeight,
      borderRadius: border.radius_round,
      cornerShape: "round",
      // Matches Progress's track. `surfaceNeutralSubtle` hits only 1.04:1
      // against a raised card in dark theme, hiding the unfilled remainder.
      backgroundColor: color.neutralBorder,
      backgroundImage: ACCENT_FILL,
    },
    "::-webkit-slider-thumb": {
      appearance: "none",
      boxSizing: "border-box",
      blockSize: sliderTokens.thumbSize,
      inlineSize: sliderTokens.thumbSize,
      borderRadius: border.radius_round,
      cornerShape: "round",
      borderStyle: "solid",
      borderWidth: border.size_2,
      borderColor: color.accent,
      backgroundColor: color.bgSurfaceBright,
      boxShadow: shadow._2,
      cursor: "inherit",
      marginBlockStart: THUMB_OFFSET,
      transition: {
        default: THUMB_LIFT,
        [motionConstants.REDUCED_MOTION]: "none",
      },
      transform: { default: null, ":hover": "scale(1.12)" },
    },
    "::-moz-range-thumb": {
      boxSizing: "border-box",
      blockSize: sliderTokens.thumbSize,
      inlineSize: sliderTokens.thumbSize,
      borderRadius: border.radius_round,
      cornerShape: "round",
      borderStyle: "solid",
      borderWidth: border.size_2,
      borderColor: color.accent,
      backgroundColor: color.bgSurfaceBright,
      boxShadow: shadow._2,
      cursor: "inherit",
      transition: {
        default: THUMB_LIFT,
        [motionConstants.REDUCED_MOTION]: "none",
      },
      transform: { default: null, ":hover": "scale(1.12)" },
    },
  },
  // Composed after `a11y.focusRing`, so the danger ring wins — matching the
  // invalid treatment on the other fields.
  inputInvalid: {
    outlineColor: { default: "transparent", ":focus-visible": color.danger },
    "::-webkit-slider-runnable-track": { backgroundImage: DANGER_FILL },
    "::-moz-range-track": { backgroundImage: DANGER_FILL },
    "::-webkit-slider-thumb": { borderColor: color.danger },
    "::-moz-range-thumb": { borderColor: color.danger },
  },
  // `:disabled` cannot be expressed from inside a pseudo-element block, so the
  // disabled track is selected by the prop instead.
  inputDisabled: {
    "::-webkit-slider-runnable-track": { backgroundImage: DISABLED_FILL },
    "::-moz-range-track": { backgroundImage: DISABLED_FILL },
    "::-webkit-slider-thumb": {
      borderColor: color.neutral,
      transform: { default: null, ":hover": "none" },
    },
    "::-moz-range-thumb": {
      borderColor: color.neutral,
      transform: { default: null, ":hover": "none" },
    },
  },
});

const fillStyles = stylex.create({
  fill: (percent: number) => ({
    [sliderTokens.fill]: `${String(percent)}%`,
  }),
});

const sizeStyles = stylex.create({
  sm: {
    [sliderTokens.trackHeight]: controlSize._1,
    [sliderTokens.thumbSize]: controlSize._4,
  },
  md: {
    [sliderTokens.trackHeight]: controlSize._2,
    [sliderTokens.thumbSize]: controlSize._5,
  },
  lg: {
    [sliderTokens.trackHeight]: controlSize._3,
    [sliderTokens.thumbSize]: controlSize._6,
  },
});

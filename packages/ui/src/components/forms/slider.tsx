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
import type { StyleProp } from "../../style-prop.ts";
import {
  border,
  color,
  controlSize,
  opacity,
  shadow,
  space,
} from "../../tokens.stylex.ts";
import { fieldStyles } from "./field-shared.stylex.ts";
import { sliderTokens } from "./slider.stylex.ts";

type SliderSize = "sm" | "md" | "lg";

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
   */
  label: string;
  /** Visually hide the label (kept in the accessibility tree via `sr-only`). */
  labelHidden?: boolean;
  /** Helper text rendered under the label and wired via `aria-describedby`. */
  description?: string;
  /** Error message. Renders with `role="alert"` and marks the field invalid. */
  error?: string;
  /**
   * Live value display rendered opposite the label. Formatting is the
   * consumer's — the Slider only places it.
   */
  readout?: ReactNode;
  /** Lower bound of the range. Defaults to `0`. */
  min?: number;
  /** Upper bound of the range. Defaults to `100`. */
  max?: number;
  /** Granularity of each step. Defaults to `1`. */
  step?: number;
  /**
   * Fires once when an interaction that moved the value ends — pointer release,
   * key release, or losing focus mid-gesture.
   */
  onCommit?: (value: number) => void;
  /** Track and thumb scale. Defaults to `"md"`. */
  size?: SliderSize;
  /** StyleX styles merged over the root wrapper — the escape hatch. */
  css?: StyleProp;
}

/**
 * A controlled value without `onChange` is a dead control: `useControlled`
 * returns a no-op setter, so the thumb springs back the moment it is released.
 */
type SliderValueProps =
  | {
      /** Controlled value. Requires `onChange`. */
      value: number;
      /** Fires on every value change, including each move of a drag. */
      onChange: (value: number) => void;
      defaultValue?: undefined;
    }
  | {
      value?: undefined;
      /** Fires on every value change, including each move of a drag. */
      onChange?: (value: number) => void;
      /** Starting value when uncontrolled. Defaults to `min`. */
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

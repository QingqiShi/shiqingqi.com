"use client";

import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import { useRadioGroup } from "../hooks/use-radio-group.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { truncate } from "../primitives/layout.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import {
  border,
  color,
  controlSize,
  font,
  shadow,
  space,
} from "../tokens.stylex.ts";

type SegmentedControlSize = "sm" | "md";

interface SegmentedControlOption<TValue extends string> {
  /** The value this segment selects. Must be unique within the group. */
  value: TValue;
  /** Visible label. Keep it to a word or two — segments share one track. */
  label: ReactNode;
  /** Decorative leading icon, rendered `aria-hidden` beside the label. */
  icon?: ReactNode;
}

interface SegmentedControlBaseProps<TValue extends string> extends Omit<
  ComponentProps<"div">,
  "children" | "onChange" | "role" | "aria-label" | "aria-labelledby"
> {
  /** Ordered segments. Arrow-key navigation follows this order. */
  options: readonly SegmentedControlOption<TValue>[];
  /** The selected value. Must match one of `options`. */
  value: TValue;
  /** Called with the next value on click or keyboard select. */
  onChange: (next: TValue) => void;
  /** Height and type scale. Defaults to `"md"`. */
  size?: SegmentedControlSize;
  /** Stretches the track to fill its container, sharing width equally. */
  fullWidth?: boolean;
  /** StyleX overrides merged over the track — composed last so a caller wins. */
  css?: StyleProp;
}

/**
 * A radiogroup needs an accessible name (WCAG 1.3.1) — the segment labels name
 * the options, never the group. Exactly one of `aria-label` / `aria-labelledby`
 * is required at the type level so an unnamed group cannot ship.
 */
type SegmentedControlProps<TValue extends string> =
  SegmentedControlBaseProps<TValue> &
    (
      | { "aria-label": string; "aria-labelledby"?: undefined }
      | { "aria-labelledby": string; "aria-label"?: undefined }
    );

/**
 * Single-select control whose options share one sunken track, the selected
 * segment raised onto a surface. Use it for two to four mutually exclusive
 * views of the same content — a wider or more open-ended set belongs in a
 * `Select`.
 *
 * The config layer over `useRadioGroup`: full WAI-ARIA radiogroup semantics
 * (roving tabindex, arrow/Home/End, focus following selection) come from the
 * hook, so a bespoke option row can reach for the hook directly and keep the
 * same keyboard model.
 *
 * Controlled only — the selected view is page state, so the parent owns it.
 */
export function SegmentedControl<TValue extends string>({
  options,
  value,
  onChange,
  size = "md",
  fullWidth,
  css,
  className,
  style,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...restProps
}: SegmentedControlProps<TValue>) {
  const { getOptionProps } = useRadioGroup({
    values: options.map((option) => option.value),
    value,
    onChange,
  });

  return (
    <div
      {...restProps}
      ref={ref}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={className}
      style={style}
      css={[
        corner.radius_2,
        styles.track,
        fullWidth && styles.trackFullWidth,
        css,
      ]}
    >
      {options.map((option) => (
        <button
          key={option.value}
          // Ahead of the spread so the hook still owns the roving `tabIndex`.
          // Without it a segment defaults to `type="submit"` and clicking one
          // inside a form submits the form instead of switching the view.
          type="button"
          {...getOptionProps(option.value)}
          css={[
            buttonReset.base,
            a11y.focusRingInset,
            transition.colors,
            corner.radius_1,
            styles.option,
            sizeStyles[size],
            fullWidth && styles.optionFullWidth,
            option.value === value && styles.optionSelected,
          ]}
        >
          {option.icon ? (
            <span css={styles.icon} aria-hidden>
              {option.icon}
            </span>
          ) : null}
          <span css={[truncate.base, styles.label]}>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

const styles = stylex.create({
  track: {
    display: "inline-flex",
    alignItems: "stretch",
    gap: space._00,
    padding: space._00,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurfaceSunken,
  },
  trackFullWidth: {
    display: "flex",
    inlineSize: "100%",
  },
  option: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: space._0,
    // Inside a rounded, tightly-padded track, so the ring goes inset (mirroring
    // cardSurface.interactive) rather than being cropped by the neighbours.
    fontWeight: font.weight_5,
    color: { default: color.textMuted, ":hover": color.textMain },
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgInteractiveHover,
    },
  },
  // A flex item's automatic minimum size is its min-content width, which for a
  // non-wrapping label is the whole label — so `flexBasis: 0` alone would still
  // let a long segment claim more than its share and, past the container width,
  // push the track into overflow. `minInlineSize: 0` is what actually makes the
  // even split hold; the label truncates rather than the track overflowing.
  optionFullWidth: {
    flexGrow: 1,
    flexBasis: 0,
    minInlineSize: 0,
  },
  optionSelected: {
    backgroundColor: {
      default: color.bgSurface,
      ":hover": color.bgSurface,
    },
    color: { default: color.textMain, ":hover": color.textMain },
    fontWeight: font.weight_6,
    boxShadow: shadow._1,
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: "1em",
    blockSize: "1em",
  },
  // Pairs with `truncate.base`: the ellipsis only engages once the label can be
  // squeezed below its min-content width.
  label: {
    minInlineSize: 0,
  },
});

const sizeStyles = stylex.create({
  sm: {
    minBlockSize: controlSize._7,
    paddingInline: controlSize._2,
    fontSize: font.uiCaption,
  },
  md: {
    minBlockSize: controlSize._8,
    paddingInline: controlSize._3,
    fontSize: font.uiBodySmall,
  },
});

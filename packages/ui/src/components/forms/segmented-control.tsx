"use client";

import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { useRadioGroup } from "../../hooks/use-radio-group.ts";
import { a11y } from "../../primitives/a11y.stylex.ts";
import { corner, cornerTokens } from "../../primitives/corner.stylex.ts";
import { truncate } from "../../primitives/layout.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
  transition,
} from "../../primitives/motion.stylex.ts";
import { buttonReset } from "../../primitives/reset.stylex.ts";
import {
  border,
  color,
  controlSize,
  font,
  shadow,
  space,
} from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { glassSurface } from "../surfaces/glass-surface.stylex.ts";

interface SegmentedControlOption<TValue extends string> {
  /** The value this segment selects. Must be unique within the group. */
  value: TValue;
  /**
   * The segment's label. Visible by default; with `hideLabels` it is
   * visually hidden and still names the segment.
   */
  label: ReactNode;
  /** Decorative leading icon, rendered `aria-hidden` beside the label. */
  icon?: ReactNode;
  /**
   * Decorative icon rendered `aria-hidden` after the label, shown only while
   * the option is selected — a sort segment's direction arrow. Its spot grows
   * in and shrinks away, so the neighbouring segments never jump.
   */
  selectedIcon?: ReactNode;
  /**
   * Replaces `label` as the segment's accessible name when the visible text
   * does not say enough — a sort segment whose name says what a second
   * activation does. Start it with the visible text (WCAG 2.5.3).
   */
  "aria-label"?: string;
}

interface SegmentedControlBaseProps<TValue extends string> extends Omit<
  ComponentProps<"div">,
  | "children"
  | "onChange"
  | "role"
  | "aria-label"
  | "aria-labelledby"
  | "className"
  | "style"
> {
  /** Ordered segments. Arrow-key navigation follows this order. */
  options: readonly SegmentedControlOption<TValue>[];
  /** The selected value. Must match one of `options`. */
  value: TValue;
  /**
   * Called with the next value on click or keyboard select. A click on the
   * selected segment calls it with the same value, so a consumer can treat
   * a re-select as a second step — a sort field flipping its direction.
   */
  onChange: (next: TValue) => void;
  /** Height and type scale. Defaults to `"md"`. */
  size?: "sm" | "md";
  /** Stretches the track to fill its container, sharing width equally. */
  fullWidth?: boolean;
  /**
   * Collapses every segment to its icon, for a tight bar. Each `label` stays
   * in the accessibility tree as the segment's name, so every option needs
   * an `icon`.
   */
  hideLabels?: boolean;
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
 * Single-select control whose options share one track, a Glass indicator
 * sliding to the selected one — for two to four mutually exclusive views; a
 * wider set belongs in `Select`. Controlled only, and built on
 * `useRadioGroup`, so a bespoke option row can reach for the hook directly and
 * keep the same keyboard model.
 */
export function SegmentedControl<TValue extends string>({
  options,
  value,
  onChange,
  size = "md",
  fullWidth,
  hideLabels,
  css,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...restProps
}: SegmentedControlProps<TValue>) {
  const { getOptionProps, hasSelection } = useRadioGroup({
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
      css={[
        corner.squircle_round,
        styles.track,
        trackSizeStyles[size],
        fullWidth && styles.trackFullWidth,
        css,
      ]}
    >
      {/* A drifted value selects no option, so nothing carries the anchor.
          An unanchored indicator falls back to its static position and
          paints a small box at the start of the track, so it is not
          rendered at all. */}
      {hasSelection ? (
        <span
          aria-hidden="true"
          // Cancel the blur from `glassSurface.base`. The track already
          // paints an opaque colour, so the blur only adds cost to each
          // slide frame.
          css={[
            corner.squircle_round,
            styles.indicator,
            segmentSizeStyles[size],
            glassSurface.base,
            styles.indicatorNoBlur,
          ]}
        />
      ) : null}
      {options.map((option) => (
        <button
          key={option.value}
          // Set before the spread so the hook still owns the roving `tabIndex`.
          // Without it, a segment defaults to `type="submit"` and submits an
          // enclosing form instead of switching the view.
          type="button"
          aria-label={option["aria-label"]}
          {...getOptionProps(option.value)}
          css={[
            buttonReset.base,
            a11y.focusRingInset,
            transition.colors,
            corner.squircle_round,
            styles.option,
            segmentSizeStyles[size],
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
          <span css={hideLabels ? a11y.srOnly : [truncate.base, styles.label]}>
            {option.label}
          </span>
          {option.selectedIcon ? (
            <span
              css={[
                styles.selectedIconSpot,
                option.value === value && styles.selectedIconSpotShown,
              ]}
              aria-hidden
            >
              <span
                css={[
                  styles.icon,
                  styles.selectedIconGrowth,
                  option.value !== value && styles.selectedIconClosed,
                ]}
              >
                {option.selectedIcon}
              </span>
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

const SELECTED_ANCHOR = "--segmented-control-selected";
const NO_ANCHOR_POSITIONING = "@supports not (anchor-name: --x)";

const styles = stylex.create({
  track: {
    display: "inline-flex",
    alignItems: "stretch",
    gap: space._00,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgCanvasSubtle,
    // `relative` makes the track the indicator's containing block, so only the
    // options in this track can be its anchor and a second control on the page
    // cannot pull it away. `isolate` keeps the indicator's negative z-index
    // inside the track's stacking context.
    position: "relative",
    isolation: "isolate",
  },
  // The one element that carries the selected option's surface. It follows the
  // anchor, so nothing measures a segment in JS.
  indicator: {
    position: "absolute",
    positionAnchor: SELECTED_ANCHOR,
    top: "anchor(top)",
    right: "anchor(right)",
    bottom: "anchor(bottom)",
    left: "anchor(left)",
    zIndex: -1,
    pointerEvents: "none",
    display: { default: null, [NO_ANCHOR_POSITIONING]: "none" },
    transition: {
      default: `top ${duration._300} ${easing.spring}, right ${duration._300} ${easing.spring}, bottom ${duration._300} ${easing.spring}, left ${duration._300} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // The track fill is opaque, so the blur has nothing to sample and only
  // repaints on each frame of the slide. Later in the indicator's `css` array
  // than `glassSurface.base`, so it wins.
  indicatorNoBlur: {
    backdropFilter: "none",
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
    // Every option carries the border, not only the selected one: the box then
    // keeps its size, and `transition.colors` has no border colour to fade in
    // from `currentColor` when the option becomes the selected one.
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: "transparent",
    // The ring is inset here, matching `cardSurface.interactive`, so it is not
    // cropped by the neighbouring segments.
    fontWeight: font.weight_5,
    color: { default: color.textMuted, ":hover": color.textMain },
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgInteractiveHover,
    },
  },
  // A non-wrapping label's min-content width blocks an even flex split, even
  // with `flexBasis: 0`. `minInlineSize: 0` fixes it, so the label truncates
  // before the track overflows.
  optionFullWidth: {
    flexGrow: 1,
    flexBasis: 0,
    minInlineSize: 0,
  },
  // The indicator paints the selected surface, so the option names the anchor
  // and gives up its own fill, edge and shadow. Where there is no anchor
  // positioning the option paints that surface itself. The weight and the
  // colour stay in both, because they are the selection signal in forced
  // colours.
  optionSelected: {
    anchorName: SELECTED_ANCHOR,
    backgroundColor: {
      default: "transparent",
      ":hover": "transparent",
      [NO_ANCHOR_POSITIONING]: {
        default: color.bgInteractiveRest,
        ":hover": color.bgInteractiveRest,
      },
    },
    color: { default: color.textMain, ":hover": color.textMain },
    fontWeight: font.weight_6,
    borderColor: {
      default: "transparent",
      [NO_ANCHOR_POSITIONING]: color.neutralBorder,
    },
    boxShadow: { default: "none", [NO_ANCHOR_POSITIONING]: shadow._1 },
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: "1em",
    blockSize: "1em",
  },
  // Holds the space for the selected option's icon and gives it up again.
  // The option's flex `gap` is laid before the spot even while the spot has no
  // width, so the negative margin takes that gap back and returns it as the
  // spot opens.
  selectedIconSpot: {
    display: "inline-flex",
    overflow: "hidden",
    flexShrink: 0,
    inlineSize: 0,
    marginInlineStart: `calc(-1 * ${space._0})`,
    transition: {
      default: `inline-size ${duration._300} ${easing.spring}, margin-inline-start ${duration._300} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  selectedIconSpotShown: {
    inlineSize: "1em",
    marginInlineStart: 0,
  },
  // The icon scales from the spot's start on the same curve as the spot's
  // width, so it grows out of the label's end whole. Clipped at the spot's
  // edge instead, a closing arrow would leave a sliver of itself behind.
  selectedIconGrowth: {
    transformOrigin: "0 50%",
    transition: {
      default: `transform ${duration._300} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  selectedIconClosed: {
    transform: "scale(0)",
  },
  // Pairs with `truncate.base`: the ellipsis engages only once the label can
  // shrink below its min-content width.
  label: {
    minInlineSize: 0,
  },
});

const trackSizeStyles = stylex.create({
  sm: {
    [cornerTokens.height]: controlSize._8,
    padding: `calc((${controlSize._8} - ${controlSize._7}) / 2 - ${border.size_1})`,
  },
  md: {
    [cornerTokens.height]: controlSize._9,
    padding: `calc((${controlSize._9} - ${controlSize._8}) / 2 - ${border.size_1})`,
  },
});

// The segment's height, which `corner.squircle_round` closes at and the option
// takes as its minimum. Shared by the option and the indicator, so the Glass
// surface never draws a different corner than the box it sits on.
const segmentSizeStyles = stylex.create({
  sm: { [cornerTokens.height]: controlSize._7 },
  md: { [cornerTokens.height]: controlSize._8 },
});

const sizeStyles = stylex.create({
  sm: {
    minBlockSize: cornerTokens.height,
    paddingInline: controlSize._2,
    fontSize: font.uiCaption,
  },
  md: {
    minBlockSize: cornerTokens.height,
    paddingInline: controlSize._3,
    fontSize: font.uiBodySmall,
  },
});

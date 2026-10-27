"use client";

import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { useRadioGroup } from "../hooks/use-radio-group.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner, cornerTokens } from "../primitives/corner.stylex.ts";
import { truncate } from "../primitives/layout.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
  transition,
} from "../primitives/motion.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import {
  border,
  color,
  controlHeight,
  controlSize,
  font,
} from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { useSegmentTrack } from "./use-segment-track.ts";

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
  /**
   * Ordered segments. Arrow-key navigation follows this order; each icon is
   * decorative. `selectedIcon` shows only while its segment is selected, its
   * spot growing in and shrinking away. An option's `aria-label` replaces
   * `label` as the accessible name when the visible text does not say enough.
   *
   * @zh 有序的分段列表。方向键导航按此顺序进行；图标均为装饰性内容。`selectedIcon` 只在该分段被选中时显示，其占位会展开与收起。当可见文字不足以说明时，选项的 `aria-label` 会取代 `label` 作为无障碍名称。
   */
  options: readonly SegmentedControlOption<TValue>[];
  /**
   * The selected value. Must match one of `options`. Controlled only — the
   * selected view is page state, so the parent owns it.
   *
   * @zh 选中的值，须与 `options` 中的某一项匹配。仅支持受控——所选视图属于页面状态，由父组件持有。
   */
  value: TValue;
  /**
   * Called with the next value on click, drag or keyboard select. A click
   * on the selected segment calls it with the same value, so a consumer can
   * treat a re-select as a second step — a sort field flipping its
   * direction. A drag calls it once, on release, and only when it ends over
   * another segment than the selected one.
   *
   * @zh 点击、拖动或键盘选择时以下一个值调用。点击已选中的分段时仍以相同的值调用，因此调用方可以把重新选择当作独立的一步——例如排序字段切换方向。拖动时只在松开时调用一次，且仅当它停在已选分段以外的分段上时才调用。
   */
  onChange: (next: TValue) => void;
  /**
   * Height and type scale.
   *
   * @zh 高度与字号阶梯。
   */
  size?: "sm" | "md";
  /**
   * Stretches the track to fill its container, sharing width equally
   * between segments. A label too long for its share truncates rather than
   * pushing the track wider.
   *
   * @zh 将轨道拉伸至填满容器，各分段均分宽度；超出所分宽度的标签会被截断，而不会把轨道撑宽。
   */
  fullWidth?: boolean;
  /**
   * Collapses every segment to its icon, for a tight bar. Each `label` stays
   * in the accessibility tree as the segment's name, so every option needs
   * an `icon`.
   *
   * @zh 将每个分段收起为图标，用于紧凑的控件条。每个 `label` 仍留在无障碍树中作为该分段的名称，因此每个选项也都需要提供 `icon`。
   */
  hideLabels?: boolean;
  /**
   * An effect the effect layer draws on the indicator. `"liquid"`, the
   * default, keeps the solid indicator at rest and lights its edge from
   * above, leaning the light towards a pointer over the control. When a
   * segment is selected, by a click, a tap or an arrow key, the effect
   * draws the indicator as liquid: it melts into water, which pours to the
   * segment, sheds drops on its way and sloshes against the far end. It
   * flows on for a moment while the drops catch up and merge into it, then
   * sets into the solid indicator in the segment's shape. A press on a
   * segment pours it there at once, and a drag from that press moves it
   * with inertia, as wide as the segment under it; on release it pours to
   * the segment under it in the same way. The labels read through the
   * indicator. Under reduced motion the indicator crossfades to its place.
   * `"none"` keeps the plain Glass indicator. The effect draws only inside
   * an `EffectLayerProvider` with WebGPU; elsewhere, and under forced
   * colours, the control looks and works as it does with `"none"`.
   *
   * @zh 由效果层在指示块上绘制的效果。默认的 `"liquid"` 在静止时保留实心指示块，并从上方照亮它的边缘；指针停在控件上时，光会偏向指针。通过点击、轻触或方向键选中分段时，由效果把指示块绘制成液体：它融化成水，涌向该分段，途中甩出水珠，在远端来回晃动。它继续流动片刻，水珠追上并融入其中，然后按该分段的形状重新凝固成实心指示块。按下某个分段时液体立即涌向该分段，从这次按下开始拖动时它带着惯性跟随，宽度随其下方的分段变化；松开后以同样的方式涌向其下方的分段。标签透过指示块显示。减少动态效果时，指示块以交叉淡入淡出到位。`"none"` 保留普通的玻璃指示块。效果只在带有 WebGPU 的 `EffectLayerProvider` 之内绘制；在其它情况下以及强制颜色模式下，控件的外观与行为与 `"none"` 相同。
   */
  effect?: "liquid" | "none";
  /**
   * StyleX overrides merged over the track — composed last so a caller wins.
   *
   * @zh 合并到轨道上的 StyleX 覆盖样式，最后合成，使调用方可覆盖。
   */
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
      | {
          /**
           * Names the radiogroup. Required unless `aria-labelledby` is
           * given — the segment labels name the options, never the group.
           *
           * @zh 为单选组命名。除非提供 `aria-labelledby`，否则必填——分段标签只命名选项，不命名整个组。
           */
          "aria-label": string;
          "aria-labelledby"?: undefined;
        }
      | {
          /**
           * Id of a visible element that names the group. Mutually
           * exclusive with `aria-label`.
           *
           * @zh 为该组命名的可见元素 id。与 `aria-label` 互斥。
           */
          "aria-labelledby": string;
          "aria-label"?: undefined;
        }
    );

/**
 * Single-select control whose options share one track, a Glass indicator
 * sliding to the selected one. A press on any option moves the indicator
 * there, and the same press can drag it along the track to another. For
 * two to four mutually exclusive views; a wider set belongs in `Select`.
 * Controlled only, and built on
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
  effect = "liquid",
  css,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  onClickCapture,
  ...restProps
}: SegmentedControlProps<TValue>) {
  const values = options.map((option) => option.value);
  const { getOptionProps, hasSelection } = useRadioGroup({
    values,
    value,
    onChange,
  });
  const selected = values.indexOf(value);
  const track = useSegmentTrack({
    selected,
    effect,
    surface: "solid",
    ref,
    handlers: restProps,
    onDrop(drop) {
      if (!drop.dragged || drop.index !== selected) {
        onChange(values[drop.index]);
      }
    },
  });

  return (
    <div
      {...restProps}
      {...track.props}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      css={[
        corner.squircle_round,
        track.css,
        styles.track,
        trackSizeStyles[size],
        fullWidth && styles.trackFullWidth,
        css,
      ]}
      onClickCapture={(event) => {
        onClickCapture?.(event);
        // The pointer handlers select on the release. A click with no
        // pointer, from a key or from assistive technology, has a detail
        // of 0 and goes on to the segment.
        if (event.detail > 0) {
          event.stopPropagation();
        }
      }}
    >
      {/* A drifted value selects no option, so nothing carries the anchor.
          An unanchored indicator falls back to its static position and
          paints a small box at the start of the track, so it is not
          rendered at all. */}
      {hasSelection ? (
        <span
          {...track.indicator}
          css={[
            corner.squircle_round,
            segmentSizeStyles[size],
            track.indicatorCss,
          ]}
        />
      ) : null}
      {options.map((option, index) => (
        <button
          key={option.value}
          // Set before the spread so the hook still owns the roving `tabIndex`.
          // Without it, a segment defaults to `type="submit"` and submits an
          // enclosing form instead of switching the view.
          type="button"
          aria-label={option["aria-label"]}
          {...track.segment(index)}
          {...getOptionProps(option.value)}
          css={[
            sizeRoles[size],
            buttonReset.base,
            a11y.focusRingInset,
            transition.colors,
            corner.squircle_round,
            styles.option,
            segmentSizeStyles[size],
            sizeStyles[size],
            fullWidth && styles.optionFullWidth,
            track.segmentCss(index),
            index === track.shown && styles.optionSelected,
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

const styles = stylex.create({
  track: {
    display: "inline-flex",
    alignItems: "stretch",
    gap: controlSize._0,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.borderControlSunken,
    backgroundColor: color.bgControlSunken,
  },
  trackFullWidth: {
    display: "flex",
    inlineSize: "100%",
  },
  option: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: controlSize._1,
    // The options touch, so a narrow option cannot extend its hit area into
    // its neighbour. Under a coarse pointer, each option is 44px wide at
    // minimum.
    minInlineSize: { default: null, [pointer.coarse]: "44px" },
    // Every option carries the border, not only the selected one: the box then
    // keeps its size, and `transition.colors` has no border colour to fade in
    // from `currentColor` when the option becomes the selected one.
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: "transparent",
    // The ring is inset here, matching `cardSurface.interactive`, so it is not
    // cropped by the neighbouring segments.
    fontWeight: font.weight_5,
    color: {
      default: color.fgControl,
      ":hover": { default: null, [pointer.canHover]: color.fg },
    },
    backgroundColor: {
      default: "transparent",
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgControlHover,
      },
    },
  },
  // A non-wrapping label's min-content width blocks an even flex split, even
  // with `flexBasis: 0`. `minInlineSize: 0` fixes it, so the label truncates
  // before the track overflows.
  optionFullWidth: {
    flexGrow: 1,
    flexBasis: 0,
    minInlineSize: 0,
    // The label is centred in an equal share, so the padding does not move it.
    // The padding only makes the label truncate sooner.
    paddingInline: controlSize._0,
  },
  // The weight and the colour are the selection signal in forced colours.
  optionSelected: {
    color: color.fg,
    fontWeight: font.weight_6,
    borderColor: "transparent",
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
    marginInlineStart: `calc(-1 * ${controlSize._1})`,
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
    [cornerTokens.height]: controlHeight.sm,
    padding: `calc((${controlHeight.sm} - ${controlSize._7}) / 2 - ${border.size_1})`,
  },
  md: {
    [cornerTokens.height]: controlHeight.md,
    padding: `calc((${controlHeight.md} - ${controlSize._8}) / 2 - ${border.size_1})`,
  },
});

// The segment's height, which `corner.squircle_round` closes at and the option
// takes as its minimum. Shared by the option and the indicator, so the Glass
// surface never draws a different corner than the box it sits on.
const segmentSizeStyles = stylex.create({
  sm: { [cornerTokens.height]: controlSize._7 },
  md: { [cornerTokens.height]: controlSize._8 },
});

const sizeRoles = {
  sm: typeRole.caption,
  md: typeRole.label,
};

const sizeStyles = stylex.create({
  sm: {
    minBlockSize: cornerTokens.height,
    paddingInline: controlSize._2,
  },
  md: {
    minBlockSize: cornerTokens.height,
    paddingInline: controlSize._3,
  },
});

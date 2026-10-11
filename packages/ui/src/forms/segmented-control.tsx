"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useMemo,
  useState,
  type ComponentProps,
  type PointerEvent,
  type ReactNode,
} from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { LIQUID_INDICATOR } from "../effect-layer/liquid-indicator.ts";
import { useLiquid } from "../effect-layer/use-liquid.ts";
import { useRadioGroup } from "../hooks/use-radio-group.ts";
import { mergeRefs } from "../merge-refs.ts";
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
import { glassSurface } from "../surfaces/glass-surface.stylex.ts";
import { border, color, controlSize, font, shadow } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { aimAt, DRAG_THRESHOLD, indexAt } from "./aim-at.ts";
import { segmentedControlMarker } from "./segmented-control.stylex.ts";

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
   * An effect the effect layer draws in place of the indicator. `"liquid"`,
   * the default, draws the indicator as frosted ice, which thaws into water
   * when the control is pressed or a segment is selected: it pours to the
   * selected segment, by a click, a tap or an arrow key, lands on its far
   * end, sloshes to rest and freezes again in the segment's shape. A press
   * on a segment pours it there at once, and a drag from that press moves
   * it with inertia, as wide as the segment under it; on release it pours
   * to the segment under it in the same way. The
   * beads it sheds on the way drift after it and merge back in, and a ring
   * light runs once round the segment from where it lands: a press above or
   * below the middle of the track aims it a little that way. The labels
   * read through the liquid. Under reduced motion the indicator goes straight
   * to its place and a still glow marks it. `"none"` keeps the plain Glass
   * indicator. The effect draws only inside an `EffectLayerProvider` with
   * WebGPU; elsewhere, and under forced colours, the control looks and
   * works as it does with `"none"`.
   *
   * @zh 由效果层代替指示块绘制的效果。默认的 `"liquid"` 把指示块画成一块结霜的冰，按下控件或选中分段时它融化成水：随点击、轻触或方向键涌向选中的分段，撞上它的远端后晃动至静止，再按分段的形状重新冻结。按下某个分段时它立即涌向该分段，从这次按下开始拖动时它带着惯性跟随，宽度随其下方的分段变化；松开后以同样的方式涌向其下方的分段。沿途甩下的水珠随惯性追上它，重新并入其中，一道环形光从落点出发绕分段跑一圈：按在轨道中线以上或以下，落点也随之略微偏上或偏下。标签透过液体显示。减少动态效果时指示块直接到位，只亮起一圈静止的微光。`"none"` 保留普通的玻璃指示块。效果只在带有 WebGPU 的 `EffectLayerProvider` 之内绘制；在其它情况下以及强制颜色模式下，控件的外观与行为与 `"none"` 相同。
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
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onKeyDown,
  onClickCapture,
  ...restProps
}: SegmentedControlProps<TValue>) {
  const values = options.map((option) => option.value);
  const { getOptionProps, hasSelection } = useRadioGroup({
    values,
    value,
    onChange,
  });
  const [pressed, setPressed] = useState(false);
  const [aim, setAim] = useState(0);
  const selected = values.indexOf(value);
  const drag = useSegmentDrag();
  const shown = drag.segment ?? selected;
  const liquidRef = useLiquid({
    position: drag.pressed ?? selected,
    drag: drag.index,
    pressed,
    aim,
  });
  // A new ref callback detaches and attaches again, which registers the
  // track on the effect layer afresh, so the merged ref holds still.
  const effectRef = effect === "liquid" ? liquidRef : undefined;
  const trackRef = useMemo(() => mergeRefs(ref, effectRef), [ref, effectRef]);

  return (
    <div
      {...restProps}
      ref={trackRef}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      css={[
        corner.squircle_round,
        segmentedControlMarker,
        styles.track,
        trackSizeStyles[size],
        fullWidth && styles.trackFullWidth,
        css,
      ]}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.pointerType !== "mouse" || event.button === 0) {
          setPressed(true);
          setAim(
            aimAt(event.currentTarget.getBoundingClientRect(), event.clientY),
          );
          drag.start(event);
        }
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        drag.move(event);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        setPressed(false);
        const drop = drag.end(event);
        if (drop !== null) {
          setAim(
            aimAt(event.currentTarget.getBoundingClientRect(), event.clientY),
          );
          if (!drop.dragged || drop.index !== selected) {
            onChange(values[drop.index]);
          }
        }
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        setPressed(false);
        drag.cancel();
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        if (drag.index === null) {
          setPressed(false);
          drag.cancel();
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        setAim(0);
      }}
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
          aria-hidden="true"
          {...{ [LIQUID_INDICATOR]: "" }}
          // Cancel the blur from `glassSurface.base`. The track already
          // paints an opaque colour, so the blur only adds cost to each
          // slide frame.
          css={[
            corner.squircle_round,
            styles.indicator,
            segmentSizeStyles[size],
            glassSurface.base,
            styles.indicatorNoBlur,
            styles.indicatorLook,
            drag.inset !== null &&
              styles.indicatorAt(drag.inset.left, drag.inset.right),
            drag.index !== null && styles.indicatorDragged,
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
            drag.pressed !== null && styles.optionHeld,
            index === shown && styles.optionSelected,
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

/** The segments of `track`, in the order of the options. */
function segmentsOf(track: HTMLElement) {
  return Array.from(track.children).filter(
    (child) => child instanceof HTMLButtonElement,
  );
}

/** A press on a segment, which a move along the track makes a drag. */
interface Press {
  readonly pointerId: number;
  readonly startX: number;
  /** The pressed segment. */
  readonly index: number;
  /** Where each segment starts and ends, in the viewport. */
  readonly segments: readonly { left: number; right: number }[];
  /** The ends of the track's padding box, in the viewport. */
  readonly paddingLeft: number;
  readonly paddingRight: number;
}

/** The segment under `x`, or the nearest one where `x` is in a gap. */
function segmentAt(segments: Press["segments"], x: number) {
  const distance = ({ left, right }: Press["segments"][number]) =>
    Math.max(left - x, 0, x - right);
  return segments.reduce(
    (best, segment, index) =>
      distance(segment) < distance(segments[best]) ? index : best,
    0,
  );
}

/** Where the plain indicator is inside the track at `index`, in CSS px. */
function insetAt(press: Press, index: number) {
  const { segments } = press;
  const from = segments[Math.floor(index)];
  const to = segments[Math.ceil(index)];
  const share = index - Math.floor(index);
  return {
    left: from.left + (to.left - from.left) * share - press.paddingLeft,
    right: press.paddingRight - from.right - (to.right - from.right) * share,
  };
}

/**
 * Pointer-drag mechanics for `SegmentedControl`, the drag of the `Switch`
 * with a stop at each segment. A press on a segment moves the indicator
 * there at once. A move of `DRAG_THRESHOLD` along the track then drags it:
 * its centre follows the pointer between the first and the last segment,
 * and its width follows the segments under it. `end` gives the pressed
 * segment, or after a drag the segment under the indicator's centre. Each
 * segment is a native button, so the track captures the pointer only once
 * the press is a drag: a capture at the press would take the press away
 * from the segment.
 */
function useSegmentDrag() {
  const [held, setHeld] = useState<{ press: Press; x: number | null } | null>(
    null,
  );
  const segment =
    held === null
      ? null
      : held.x === null
        ? held.press.index
        : segmentAt(held.press.segments, held.x);
  const index =
    held === null || held.x === null
      ? null
      : indexAt(
          held.press.segments.map(({ left, right }) => (left + right) / 2),
          held.x,
        );

  function cancel() {
    setHeld(null);
  }

  return {
    /** The pressed segment, where the indicator goes until the release. */
    pressed: held?.press.index ?? null,
    /** Where a drag holds the indicator's centre, as a segment index. */
    index,
    /** The segment under the indicator, which looks selected until the release. */
    segment,
    inset:
      held === null ? null : insetAt(held.press, index ?? held.press.index),
    start(event: PointerEvent<HTMLDivElement>) {
      const track = event.currentTarget;
      const segments = segmentsOf(track);
      const pressed = segments.findIndex(
        (segment) =>
          event.target instanceof Node && segment.contains(event.target),
      );
      if (pressed < 0 || segments[pressed].matches(":disabled")) {
        return;
      }
      const paddingLeft = track.getBoundingClientRect().left + track.clientLeft;
      setHeld({
        press: {
          pointerId: event.pointerId,
          startX: event.clientX,
          index: pressed,
          segments: segments.map((segment) => {
            const { left, right } = segment.getBoundingClientRect();
            return { left, right };
          }),
          paddingLeft,
          paddingRight: paddingLeft + track.clientWidth,
        },
        x: null,
      });
    },
    move(event: PointerEvent<HTMLDivElement>) {
      if (held === null || event.pointerId !== held.press.pointerId) {
        return;
      }
      if (
        held.x === null &&
        Math.abs(event.clientX - held.press.startX) < DRAG_THRESHOLD
      ) {
        return;
      }
      if (held.x === null) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      setHeld({ press: held.press, x: event.clientX });
    },
    end(event: PointerEvent<HTMLDivElement>) {
      setHeld(null);
      if (held === null || event.pointerId !== held.press.pointerId) {
        return null;
      }
      return { index: segment ?? held.press.index, dragged: held.x !== null };
    },
    cancel,
  };
}

const SELECTED_ANCHOR = "--segmented-control-selected";
const NO_ANCHOR_POSITIONING = "@supports not (anchor-name: --x)";
/** The effect layer sets this attribute on the track while it draws the indicator. */
const DRAWN_BY_EFFECT = ":is([data-effect-drawn])";

const styles = stylex.create({
  track: {
    display: "inline-flex",
    alignItems: "stretch",
    gap: controlSize._0,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurfaceSunken,
    // `relative` makes the track the indicator's containing block, so only the
    // options in this track can be its anchor and a second control on the page
    // cannot pull it away. `isolate` keeps the indicator's negative z-index
    // inside the track's stacking context.
    position: "relative",
    // A drag along the track moves the indicator, and a swipe across it
    // still scrolls the page.
    touchAction: "pan-y",
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
      default: `top ${duration._300} ${easing.spring}, right ${duration._300} ${easing.spring}, bottom ${duration._300} ${easing.spring}, left ${duration._300} ${easing.spring}, opacity ${duration._400} ${easing.linear}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    // It keeps its box, its colours and its corners while the effect draws
    // in its place, so the effect can read them from it. It fades out while
    // the effect's glow fades in, so the change of shape does not jump.
    opacity: {
      default: null,
      [stylex.when.ancestor(DRAWN_BY_EFFECT, segmentedControlMarker)]: 0,
    },
  },
  // A press holds the indicator off its anchor. Its top and bottom stay on
  // the anchor. On release it slides back to the anchor on the spring.
  indicatorAt: (left: number, right: number) => ({
    left: `${String(left)}px`,
    right: `${String(right)}px`,
  }),
  indicatorDragged: {
    transition: "none",
  },
  // The effect reads the colour of the ring light from the text colour. The
  // indicator has no text, so this colour does not show.
  indicatorLook: {
    color: color.bgAccent,
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
      default: color.fgMuted,
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
  // A held press keeps the indicator under the pointer, so no hover fill
  // covers it.
  optionHeld: {
    backgroundColor: "transparent",
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
  // positioning the option paints that surface itself, unless the effect
  // draws the indicator over the track. The weight and the colour stay in
  // all of them, because they are the selection signal in forced colours.
  optionSelected: {
    anchorName: SELECTED_ANCHOR,
    backgroundColor: {
      default: "transparent",
      [NO_ANCHOR_POSITIONING]: {
        default: color.bgControl,
        [stylex.when.ancestor(DRAWN_BY_EFFECT, segmentedControlMarker)]:
          "transparent",
      },
    },
    color: color.fg,
    fontWeight: font.weight_6,
    borderColor: {
      default: "transparent",
      [NO_ANCHOR_POSITIONING]: {
        default: color.border,
        [stylex.when.ancestor(DRAWN_BY_EFFECT, segmentedControlMarker)]:
          "transparent",
      },
    },
    boxShadow: {
      default: "none",
      [NO_ANCHOR_POSITIONING]: {
        default: shadow._1,
        [stylex.when.ancestor(DRAWN_BY_EFFECT, segmentedControlMarker)]: "none",
      },
    },
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

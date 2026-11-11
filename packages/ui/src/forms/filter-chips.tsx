"use client";

import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import {
  outlineSurface,
  outlineSurfaceSize,
} from "../actions/outline-surface.stylex.ts";
import { Badge } from "../data-display/badge.tsx";
import { useRadioGroup } from "../hooks/use-radio-group.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { scrollX } from "../primitives/layout.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import { row } from "../primitives/stack.stylex.ts";
import { typeModifier, typeRole } from "../primitives/type.stylex.ts";
import { ScrollMask } from "../surfaces/scroll-mask.tsx";
import { space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";

interface FilterChipsOption<TValue extends string> {
  /** The value this chip selects. Must be unique within the group. */
  value: TValue;
  /** The chip's visible label. */
  label: ReactNode;
  /**
   * A number after the label, such as how many items the filter shows. It
   * is part of the chip's name, so a screen reader reads "Problems 1".
   */
  count?: number;
  /**
   * The colour of `count`. `"destructive"` says the items need attention, such
   * as problems; `"neutral"`, the default, is a plain tally.
   */
  countIntent?: "neutral" | "destructive";
  /**
   * Replaces the label and the count as the chip's accessible name when
   * they do not say enough. Start it with the visible text (WCAG 2.5.3).
   */
  "aria-label"?: string;
}

interface FilterChipsBaseProps<TValue extends string> extends Omit<
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
   * The chips in order. The arrow keys move through them in this order. Any
   * number fits: a row that is wider than its box scrolls sideways, and its
   * edges blur while there is more to see.
   *
   * @zh 按顺序排列的筛选项。方向键按此顺序移动。数量不限：比容器更宽的一行会横向滚动，还有内容可看时边缘会虚化。
   */
  options: readonly FilterChipsOption<TValue>[];
  /**
   * The selected value. Must match one of `options`. Controlled only: the
   * filter is page state, so the parent owns it.
   *
   * @zh 选中的值，须与 `options` 中的某一项匹配。仅支持受控：筛选条件属于页面状态，由父组件持有。
   */
  value: TValue;
  /**
   * Called with the next value on a click or an arrow key.
   *
   * @zh 点击或按方向键时以下一个值调用。
   */
  onChange: (next: TValue) => void;
  /**
   * Height and type scale, the same steps as an outline `Button`.
   *
   * @default "sm"
   * @zh 高度与字号阶梯，与描边样式的 `Button` 相同。
   */
  size?: "xs" | "sm";
  /**
   * The accessible names of the buttons that scroll the row one page
   * towards each end. They show only on a device that cannot swipe, and only
   * while the row can scroll that way. The package ships no i18n, so the
   * names come in as props. Give them wherever the row can be wider than
   * its box.
   *
   * @zh 将这一行向两端各翻一页的按钮的无障碍名称。它们只在无法滑动的设备上、且这一行能朝该方向滚动时显示。本包不含 i18n，名称由调用方传入。只要这一行可能比容器更宽，就应提供。
   */
  scrollButtons?: { startLabel: string; endLabel: string };
  /**
   * StyleX styles merged over the root, composed last, such as how the row
   * sits in the layout around it.
   *
   * @zh 合并在根元素之上的 StyleX 样式，最后合成，例如这一行在周围布局中的位置。
   */
  css?: StyleProp;
}

/**
 * A radiogroup needs an accessible name (WCAG 1.3.1): the chip labels name
 * the options, never the group.
 */
type FilterChipsProps<TValue extends string> = FilterChipsBaseProps<TValue> &
  (
    | {
        /**
         * Names the group, such as "Show". Required unless `aria-labelledby`
         * is given.
         *
         * @zh 为该组命名，例如「显示」。除非提供 `aria-labelledby`，否则必填。
         */
        "aria-label": string;
        "aria-labelledby"?: undefined;
      }
    | {
        /**
         * The id of a visible element that names the group.
         *
         * @zh 为该组命名的可见元素 id。
         */
        "aria-labelledby": string;
        "aria-label"?: undefined;
      }
  );

/**
 * One filter of a list among any number, as a row of chips that stays on one
 * line: All, Filed, Archived, Junk. It is one radiogroup, so Tab reaches the
 * selected chip and the arrow keys move the selection. A row too wide for
 * its box scrolls sideways under blurred edges. For two to four views of
 * one thing, take `SegmentedControl`; for a long list that need not show,
 * take `Select`.
 */
export function FilterChips<TValue extends string>({
  options,
  value,
  onChange,
  size = "sm",
  scrollButtons,
  css,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...restProps
}: FilterChipsProps<TValue>) {
  const { getOptionProps } = useRadioGroup({
    values: options.map((option) => option.value),
    value,
    onChange,
  });

  return (
    <ScrollMask
      {...restProps}
      orientation="horizontal"
      clipMargin={space._1}
      scrollButtons={scrollButtons}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      css={css}
      contentCss={[scrollX.base, row.tight]}
    >
      {options.map((option) => (
        <button
          key={option.value}
          // Set before the spread so the hook still owns the roving `tabIndex`.
          // Without it, a chip submits an enclosing form.
          type="button"
          aria-label={option["aria-label"]}
          {...getOptionProps(option.value)}
          css={[
            size === "xs" ? typeRole.caption : typeRole.label,
            buttonReset.base,
            outlineSurface.layout,
            outlineSurface.skin,
            outlineSurfaceSize[size],
            corner.squircle_round,
            outlineSurface.interactive,
            option.value === value && outlineSurface.active,
          ]}
        >
          {option.label}
          {option.count === undefined ? null : (
            <>
              {/* Keeps the label and the count apart in the accessible
                  name. The flex layout does not show it. */}{" "}
              <Badge
                size="sm"
                intent={option.countIntent ?? "neutral"}
                css={[
                  typeModifier.numeric,
                  option.value === value && styles.selectedCount,
                ]}
              >
                {option.count}
              </Badge>
            </>
          )}
        </button>
      ))}
    </ScrollMask>
  );
}

const styles = stylex.create({
  // The selected chip has the primary fill, on which the colours of a badge
  // are not legible. Thus the count takes the colour of the chip's text.
  selectedCount: {
    color: "inherit",
    backgroundColor: "color-mix(in oklab, currentColor 20%, transparent)",
  },
});

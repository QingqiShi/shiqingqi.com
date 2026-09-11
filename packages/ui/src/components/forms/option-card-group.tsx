import type { ComponentProps, ReactNode } from "react";
import type { StyleProp } from "../../types.ts";
import {
  MultipleSelectGroup,
  type MultipleSelectProps,
} from "./multiple-select-group.tsx";
import type { OptionCardLook } from "./option-card.tsx";
import {
  SingleSelectGroup,
  type SingleSelectProps,
} from "./single-select-group.tsx";

interface OptionCardGroupOption<TValue extends string> {
  /** The value this card selects. Must be unique within the group. */
  value: TValue;
  /** The card's primary text. */
  label: ReactNode;
  /** Supporting copy beneath the label. */
  description?: ReactNode;
  /** Decorative leading graphic, rendered `aria-hidden`. */
  icon?: ReactNode;
  /** Renders the card unselectable and skips it in keyboard navigation. */
  disabled?: boolean;
}

/** @internal */
export interface OptionCardGroupBaseProps<TValue extends string> extends Omit<
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
   * Ordered cards. Arrow-key navigation follows this order, and a disabled
   * card is skipped by it.
   *
   * @zh 有序的卡片列表。方向键导航按此顺序进行，被禁用的卡片会被跳过。
   */
  options: readonly OptionCardGroupOption<TValue>[];
  /**
   * A stack of full-width rows, or a grid of centred tiles that wraps at
   * 9rem per card.
   *
   * @zh 撑满宽度的行式堆叠，或每张卡片最小 9rem、自动换行的居中方块网格。
   */
  look?: OptionCardLook;
  /**
   * StyleX overrides merged over the group — composed last so a caller wins.
   *
   * @zh 合并到该组上的 StyleX 覆盖样式，最后合成，使调用方可覆盖。
   */
  css?: StyleProp;
}

/**
 * A group needs an accessible name (WCAG 1.3.1) — the card labels name the
 * options, never the group. Exactly one of `aria-label` / `aria-labelledby` is
 * required at the type level so an unnamed group cannot ship.
 * @internal
 */
export type OptionCardGroupNaming =
  | {
      /**
       * Names the group. Required unless `aria-labelledby` is given — one of
       * the two is enforced at the type level, because the card labels name
       * the options, never the group.
       *
       * @zh 为该组命名。除非提供 `aria-labelledby`，否则必填——类型层面强制二选一，因为卡片标签只命名选项，不命名整个组。
       */
      "aria-label": string;
      "aria-labelledby"?: undefined;
    }
  | {
      /**
       * Id of a visible element that names the group — usually the question
       * above it. Mutually exclusive with `aria-label`.
       *
       * @zh 为该组命名的可见元素 id——通常是其上方的问题，与 `aria-label` 互斥。
       */
      "aria-labelledby": string;
      "aria-label"?: undefined;
    };

type OptionCardGroupProps<TValue extends string> =
  SingleSelectProps<TValue> | MultipleSelectProps<TValue>;

/**
 * The card-sized answer to a question: a controlled group of `OptionCard`s
 * driven by an options array, single-select by default and
 * `selection="multiple"` for independent toggles.
 *
 * For a card carrying bespoke content, render `OptionCard` yourself and drive
 * it with `useRadioGroup` for the same keyboard model.
 */
export function OptionCardGroup<TValue extends string>(
  props: OptionCardGroupProps<TValue>,
) {
  // Two components rather than one branching body: `useRadioGroup` has no work
  // to do in multi-select, and a hook cannot be called conditionally.
  return props.selection === "multiple" ? (
    <MultipleSelectGroup {...props} />
  ) : (
    <SingleSelectGroup {...props} />
  );
}

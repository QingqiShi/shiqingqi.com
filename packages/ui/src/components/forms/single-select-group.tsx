"use client";

import { useRadioGroup } from "../../hooks/use-radio-group.ts";
import { groupStyles } from "./option-card-group.stylex.ts";
import type {
  OptionCardGroupBaseProps,
  OptionCardGroupNaming,
} from "./option-card-group.tsx";
import { OptionCard } from "./option-card.tsx";

/** @internal */
export type SingleSelectProps<TValue extends string> =
  OptionCardGroupBaseProps<TValue> &
    OptionCardGroupNaming & {
      /**
       * Single renders a radiogroup with roving focus; multiple renders a
       * plain group of independently tabbable checkboxes.
       *
       * @zh single 渲染为带漫游焦点的单选组；multiple 渲染为一组各自可 Tab 到达的复选框。
       */
      selection?: "single";
      /**
       * The selected value, or the selected values when `selection` is
       * `"multiple"`. Controlled only — the answer is page state, so the
       * parent owns it.
       *
       * @zh 选中的值；当 `selection` 为 `"multiple"` 时为选中值的数组。仅支持受控——答案属于页面状态，由父组件持有。
       */
      value: TValue;
      /**
       * Called with the next value on click or keyboard select; with the
       * next array whenever a multi-select card is toggled.
       *
       * @zh 点击或键盘选择时以下一个值调用；多选时每次切换卡片则以下一个数组调用。
       */
      onChange: (next: TValue) => void;
    };

/**
 * `OptionCardGroup`'s single-select mode: a WAI-ARIA radiogroup built on
 * `useRadioGroup` — roving tabindex, arrow/Home/End, focus following
 * selection — that skips disabled cards.
 * @internal
 */
export function SingleSelectGroup<TValue extends string>({
  options,
  value,
  onChange,
  look = "row",
  selection: _selection,
  css,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...restProps
}: SingleSelectProps<TValue>) {
  const { getOptionProps } = useRadioGroup({
    // Disabled cards stay rendered and announced, but sit out of the
    // arrow-key order, so keys never select one.
    values: options
      .filter((option) => option.disabled !== true)
      .map((option) => option.value),
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
      css={[groupStyles[look], css]}
    >
      {options.map((option) => (
        <OptionCard
          key={option.value}
          {...getOptionProps(option.value)}
          selected={option.value === value}
          disabled={option.disabled}
          look={look}
          icon={option.icon}
          label={option.label}
          description={option.description}
        />
      ))}
    </div>
  );
}

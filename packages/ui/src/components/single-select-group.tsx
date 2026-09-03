"use client";

import { useRadioGroup } from "../hooks/use-radio-group.ts";
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
      /** Mutually exclusive cards. The default. */
      selection?: "single";
      /** The selected value. Must match one of `options`. */
      value: TValue;
      /** Called with the next value on click or keyboard select. */
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
  variant = "row",
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
      css={[groupStyles[variant], css]}
    >
      {options.map((option) => (
        <OptionCard
          key={option.value}
          {...getOptionProps(option.value)}
          selected={option.value === value}
          disabled={option.disabled}
          variant={variant}
          icon={option.icon}
          label={option.label}
          description={option.description}
        />
      ))}
    </div>
  );
}

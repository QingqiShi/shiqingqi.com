"use client";

import { groupStyles } from "./option-card-group.stylex.ts";
import type {
  OptionCardGroupBaseProps,
  OptionCardGroupNaming,
} from "./option-card-group.tsx";
import { OptionCard } from "./option-card.tsx";

/** @internal */
export type MultipleSelectProps<TValue extends string> =
  OptionCardGroupBaseProps<TValue> &
    OptionCardGroupNaming & {
      /** Independently toggled cards. */
      selection: "multiple";
      /** The selected values, in any order. */
      value: readonly TValue[];
      /** Called with the next values whenever a card is toggled. */
      onChange: (next: TValue[]) => void;
    };

/**
 * `OptionCardGroup`'s multi-select mode: a plain group of checkboxes, each
 * independently tabbable, as the pattern requires.
 * @internal
 */
export function MultipleSelectGroup<TValue extends string>({
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
}: MultipleSelectProps<TValue>) {
  const selectedValues = new Set(value);

  return (
    <div
      {...restProps}
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      css={[groupStyles[variant], css]}
    >
      {options.map((option) => (
        <OptionCard
          key={option.value}
          role="checkbox"
          selected={selectedValues.has(option.value)}
          disabled={option.disabled}
          variant={variant}
          icon={option.icon}
          label={option.label}
          description={option.description}
          onClick={() => {
            onChange(
              selectedValues.has(option.value)
                ? value.filter((current) => current !== option.value)
                : [...value, option.value],
            );
          }}
        />
      ))}
    </div>
  );
}

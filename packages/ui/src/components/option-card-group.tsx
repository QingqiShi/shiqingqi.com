import type { ComponentProps, ReactNode } from "react";
import type { StyleProp } from "../style-prop.ts";
import {
  MultipleSelectGroup,
  type MultipleSelectProps,
} from "./multiple-select-group.tsx";
import type { OptionCardVariant } from "./option-card.tsx";
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
  /** Ordered cards. Arrow-key navigation follows this order. */
  options: readonly OptionCardGroupOption<TValue>[];
  /** A stack of full-width rows, or a grid of centred tiles. */
  variant?: OptionCardVariant;
  /** StyleX overrides merged over the group — composed last so a caller wins. */
  css?: StyleProp;
}

/**
 * A group needs an accessible name (WCAG 1.3.1) — the card labels name the
 * options, never the group. Exactly one of `aria-label` / `aria-labelledby` is
 * required at the type level so an unnamed group cannot ship.
 * @internal
 */
export type OptionCardGroupNaming =
  | { "aria-label": string; "aria-labelledby"?: undefined }
  | { "aria-labelledby": string; "aria-label"?: undefined };

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

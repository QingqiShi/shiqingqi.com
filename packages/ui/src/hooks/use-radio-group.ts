"use client";

import { useCallback, useRef } from "react";

interface RadioGroupOptions<TValue extends string> {
  /** Ordered list of option values. Arrow-key navigation follows this order. */
  values: readonly TValue[];
  /** Currently selected value. Must be one of `values`. */
  value: TValue;
  /** Called when the user picks a value via click or keyboard. */
  onChange: (next: TValue) => void;
}

interface OptionProps {
  /** Ref registration so arrow keys can move focus between options. */
  ref: (node: HTMLButtonElement | null) => void;
  role: "radio";
  "aria-checked": boolean;
  tabIndex: 0 | -1;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

/**
 * ARIA radiogroup semantics for a single-select group of <button>s. Returns a
 * `getOptionProps(value)` factory that supplies `role="radio"`,
 * `aria-checked`, roving `tabIndex`, click + keyboard handlers, and a ref
 * registration so arrow keys can move focus between options. Pair the
 * options with a wrapper carrying `role="radiogroup"` and an `aria-label`
 * (or `aria-labelledby`).
 *
 * Keyboard model matches WAI-ARIA: ArrowRight/Down moves to the next option
 * and selects it; ArrowLeft/Up to the previous; Home / End jump to the
 * first / last; activation wraps. Focus follows selection so the new option
 * announces immediately, matching native <input type="radio"> behaviour.
 *
 * @param values Ordered option values; arrow navigation follows this order.
 * @param value The currently selected value (one of `values`).
 * @param onChange Invoked with the next value on click or keyboard select.
 * @returns An object with `getOptionProps(optionValue)`, which returns the
 * `ref`, `role`, `aria-checked`, `tabIndex`, `onClick`, and `onKeyDown` props
 * to spread onto the button rendering that option.
 */
export function useRadioGroup<TValue extends string>({
  values,
  value,
  onChange,
}: RadioGroupOptions<TValue>) {
  const nodesRef = useRef(new Map<TValue, HTMLButtonElement>());

  const focusValue = useCallback((target: TValue) => {
    nodesRef.current.get(target)?.focus();
  }, []);

  const move = useCallback(
    (delta: 1 | -1) => {
      if (values.length === 0) return;
      const currentIndex = values.indexOf(value);
      // If the current value isn't in the list (shouldn't happen but be
      // defensive), fall back to the first option.
      const baseIndex = currentIndex === -1 ? 0 : currentIndex;
      const nextIndex = (baseIndex + delta + values.length) % values.length;
      const nextValue = values[nextIndex];
      onChange(nextValue);
      focusValue(nextValue);
    },
    [focusValue, onChange, value, values],
  );

  const jump = useCallback(
    (target: "first" | "last") => {
      if (values.length === 0) return;
      const nextValue =
        target === "first" ? values[0] : values[values.length - 1];
      onChange(nextValue);
      focusValue(nextValue);
    },
    [focusValue, onChange, values],
  );

  /**
   * Build the props for the option rendering `optionValue`. Spread the result
   * onto the option's <button>. Supplies `role="radio"`, `aria-checked`,
   * roving `tabIndex` (0 for the selected option, -1 otherwise), a click
   * handler that selects the option, a keydown handler implementing the
   * WAI-ARIA arrow/Home/End model, and a `ref` that registers the node so
   * keyboard navigation can move focus.
   */
  const getOptionProps = useCallback(
    (optionValue: TValue): OptionProps => ({
      ref: (node) => {
        if (node === null) {
          nodesRef.current.delete(optionValue);
        } else {
          nodesRef.current.set(optionValue, node);
        }
      },
      role: "radio",
      "aria-checked": optionValue === value,
      tabIndex: optionValue === value ? 0 : -1,
      onClick: () => {
        onChange(optionValue);
      },
      onKeyDown: (event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          move(1);
          return;
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          move(-1);
          return;
        }
        if (event.key === "Home") {
          event.preventDefault();
          jump("first");
          return;
        }
        if (event.key === "End") {
          event.preventDefault();
          jump("last");
        }
      },
    }),
    [jump, move, onChange, value],
  );

  return { getOptionProps };
}

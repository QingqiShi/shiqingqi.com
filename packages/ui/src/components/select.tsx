"use client";

import * as stylex from "@stylexjs/stylex";
import { type ComponentProps, type ReactNode } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import { useFieldAria } from "../hooks/use-field-aria.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import {
  fieldSizeBox,
  fieldSizeInline,
  fieldStyles,
} from "./field-shared.stylex.ts";

type SelectSize = "sm" | "md" | "lg";

/** A single choice for the {@link Select} `options` config layer. */
interface SelectOption {
  /** Submitted value; also the option's React key. */
  value: string;
  /** Visible option text. */
  label: string;
  /** Prevents selection while keeping the option listed. */
  disabled?: boolean;
}

interface SelectProps extends Omit<
  ComponentProps<"select">,
  "size" | "children"
> {
  /** Visible text that labels the select. Pass `labelHidden` to keep it screen-reader-only. */
  label: string;
  /** Visually hide the label while keeping it as the accessible name. */
  labelHidden?: boolean;
  /** Supporting copy shown beneath the control and wired via `aria-describedby`. */
  description?: string;
  /**
   * Error message shown beneath the control. Presence flips `aria-invalid` and
   * appends the message to `aria-describedby`.
   */
  error?: string;
  /**
   * Config-layer option list. Rendered as `<option>`s in order. Omit and pass
   * `<option>` `children` instead for the escape hatch (option groups, custom
   * attributes).
   */
  options?: ReadonlyArray<SelectOption>;
  /**
   * Placeholder rendered as a disabled, hidden first option. Shown until the
   * user picks a real value. When uncontrolled and no `defaultValue` is given,
   * the empty placeholder is selected initially.
   */
  placeholder?: string;
  /**
   * Control height and type scale. Shares the field size ramp with `TextField`
   * / `Textarea`. Defaults to `"md"`.
   */
  size?: SelectSize;
  /** `<option>` elements — the escape hatch when `options` is not enough. */
  children?: ReactNode;
  /** StyleX styles merged over the field root — the config-layer escape hatch. */
  css?: StyleProp;
}

/**
 * Inline chevron matching Phosphor "CaretDown" metrics. Rendered inside the
 * shared trailing-affix slot (`aria-hidden`, no pointer events), so clicks fall
 * through to the native control beneath it.
 */
function ChevronIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 256 256" fill="none">
      <path
        d="M208 96l-80 80-80-80"
        stroke="currentColor"
        strokeWidth={20}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * A labelled wrapper around a native `<select>` — chosen over a custom listbox
 * for its built-in keyboard handling, platform picker, and reliability. It
 * composes the same {@link fieldStyles} chrome as `TextField` / `Textarea`
 * (label, control box, hover/focus affordance, sizes, invalid state) so the
 * form-control family reads identically; only the native chevron is swapped for
 * a themed one in the trailing-affix slot. Forwards native select props
 * (`value`, `defaultValue`, `onChange`, `name`, `disabled`, `ref`, …).
 *
 * Provide choices via the `options` prop (config layer) or by passing
 * `<option>` `children` (escape hatch).
 */
export function Select({
  label,
  labelHidden,
  description,
  error,
  options,
  placeholder,
  size = "md",
  children,
  css,
  className,
  style,
  id: idProp,
  value,
  defaultValue,
  disabled,
  ref,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...rest
}: SelectProps) {
  const {
    fieldId,
    descriptionId,
    errorId,
    hasDescription,
    hasError,
    describedBy,
    ariaInvalid: resolvedAriaInvalid,
  } = useFieldAria({
    id: idProp,
    ariaDescribedBy,
    ariaInvalid,
    description,
    error,
  });

  // A disabled placeholder is not auto-selected by the browser, so when the
  // select is uncontrolled and has no explicit default we point `defaultValue`
  // at the empty placeholder. Never emit `defaultValue` alongside a controlled
  // `value` (React warns), so only compute it when `value` is absent.
  const isControlled = value !== undefined;
  const resolvedDefaultValue = isControlled
    ? undefined
    : (defaultValue ?? (placeholder !== undefined ? "" : undefined));

  return (
    <div css={[fieldStyles.root, css]}>
      <label
        htmlFor={fieldId}
        css={[fieldStyles.label, labelHidden && a11y.srOnly]}
      >
        {label}
      </label>
      {hasDescription ? (
        <span id={descriptionId} css={fieldStyles.description}>
          {description}
        </span>
      ) : null}
      <div css={[fieldStyles.controlAffixRow, fieldSizeInline[size]]}>
        <select
          {...rest}
          id={fieldId}
          ref={ref}
          value={value}
          defaultValue={resolvedDefaultValue}
          disabled={disabled}
          aria-invalid={resolvedAriaInvalid}
          aria-describedby={describedBy}
          className={className}
          style={style}
          css={[
            fieldStyles.control,
            fieldSizeBox[size],
            fieldStyles.hasTrailingAffix,
            transition.colors,
            a11y.focusRing,
            styles.select,
            hasError ? fieldStyles.controlInvalid : null,
          ]}
        >
          {placeholder !== undefined ? (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          ) : null}
          {options
            ? options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))
            : children}
        </select>
        <span css={[fieldStyles.affix, fieldStyles.affixEnd]} aria-hidden>
          <ChevronIcon />
        </span>
      </div>
      {hasError ? (
        <span id={errorId} role="alert" css={fieldStyles.errorText}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  // A select is a picker, not a text input, so it overrides the field control's
  // text caret with a pointer.
  select: {
    cursor: { default: "pointer", ":disabled": "not-allowed" },
  },
});

"use client";

import * as stylex from "@stylexjs/stylex";
import { type ComponentProps, type ReactNode } from "react";
import { useFieldAria } from "../hooks/use-field-aria.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { ChevronIcon } from "./chevron-icon.tsx";
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
  "size" | "children" | "className" | "style"
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
   * Config-layer option list; omit it and pass `<option>` `children` instead
   * for the escape hatch (option groups, custom attributes).
   */
  options?: ReadonlyArray<SelectOption>;
  /**
   * Placeholder rendered as a disabled, hidden first option. When uncontrolled
   * with no `defaultValue`, it is selected initially.
   */
  placeholder?: string;
  /**
   * Control height and type scale. Defaults to `"md"`.
   */
  size?: SelectSize;
  /** `<option>` elements — the escape hatch when `options` is not enough. */
  children?: ReactNode;
  /** StyleX styles merged over the field root — the config-layer escape hatch. */
  css?: StyleProp;
}

/**
 * A labelled wrapper around a native `<select>`, chosen over a custom listbox
 * for its built-in keyboard handling, platform picker, and reliability.
 *
 * Shares the same field chrome as `TextField` / `Textarea`; only the native
 * chevron is swapped for a themed one in the trailing-affix slot.
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

  // Set `defaultValue` only when uncontrolled: React warns if a controlled
  // `value` also gets a `defaultValue`.
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
          <ChevronIcon direction="block-end" />
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
  // A select is a picker, not a text input, so this overrides the shared
  // cursor with a pointer.
  select: {
    cursor: { default: "pointer", ":disabled": "not-allowed" },
  },
});

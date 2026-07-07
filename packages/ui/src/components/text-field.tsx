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

type FieldSize = "sm" | "md" | "lg";

// `size` on the intrinsic input is the HTML character-width attribute; the
// design system reuses the name for its own scale, so drop the native one.
interface TextFieldProps extends Omit<ComponentProps<"input">, "size"> {
  /**
   * Visible label text. Always required for an accessible name, even when
   * hidden via {@link TextFieldProps.labelHidden} — never rely on a
   * placeholder to name the field.
   */
  label: string;
  /**
   * Visually hide the label (kept in the accessibility tree via `sr-only`).
   * Use when an adjacent visual cue already names the field; the `label`
   * string is still required.
   */
  labelHidden?: boolean;
  /** Helper text rendered under the label and wired via `aria-describedby`. */
  description?: string;
  /**
   * Error message. When set, the control gets invalid styling + `aria-invalid`,
   * the message renders with `role="alert"`, and it is appended to the
   * control's `aria-describedby`.
   */
  error?: string;
  /** Control scale. Drives padding and min height. Defaults to `"md"`. */
  size?: FieldSize;
  /** Decorative leading adornment (icon), rendered `aria-hidden`. */
  leading?: ReactNode;
  /** Decorative trailing adornment (icon), rendered `aria-hidden`. */
  trailing?: ReactNode;
  /** StyleX overrides merged over the control's own — the escape hatch. */
  css?: StyleProp;
}

/**
 * Single-line text input with a built-in label, optional helper text, and an
 * error state, all accessibly wired (`htmlFor`, `aria-describedby`,
 * `aria-invalid`, `role="alert"`). Forwards `ref` and native `<input>`
 * attributes to the underlying element, and stays server-renderable (no client
 * directive) since it only uses `useId`.
 */
export function TextField({
  label,
  labelHidden,
  description,
  error,
  size = "md",
  leading,
  trailing,
  id,
  required,
  disabled,
  css,
  className,
  style,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ref,
  ...rest
}: TextFieldProps) {
  const {
    fieldId,
    descriptionId,
    errorId,
    hasDescription,
    hasError,
    describedBy,
    ariaInvalid: resolvedAriaInvalid,
  } = useFieldAria({ id, ariaDescribedBy, ariaInvalid, description, error });

  return (
    <div css={fieldStyles.root}>
      <label
        htmlFor={fieldId}
        css={[
          fieldStyles.label,
          required && fieldStyles.labelRequired,
          labelHidden && a11y.srOnly,
        ]}
      >
        {label}
      </label>
      {hasDescription ? (
        <span id={descriptionId} css={fieldStyles.description}>
          {description}
        </span>
      ) : null}
      <div css={[fieldStyles.controlAffixRow, fieldSizeInline[size]]}>
        {leading ? (
          <span css={[fieldStyles.affix, fieldStyles.affixStart]} aria-hidden>
            {leading}
          </span>
        ) : null}
        <input
          {...rest}
          ref={ref}
          id={fieldId}
          required={required}
          disabled={disabled}
          aria-invalid={resolvedAriaInvalid}
          aria-describedby={describedBy}
          className={className}
          style={style}
          css={[
            fieldStyles.control,
            fieldSizeBox[size],
            transition.colors,
            a11y.focusRing,
            leading ? fieldStyles.hasLeadingAffix : null,
            trailing ? fieldStyles.hasTrailingAffix : null,
            hasError ? fieldStyles.controlInvalid : null,
            css,
          ]}
        />
        {trailing ? (
          <span css={[fieldStyles.affix, fieldStyles.affixEnd]} aria-hidden>
            {trailing}
          </span>
        ) : null}
      </div>
      {hasError ? (
        <span id={errorId} role="alert" css={fieldStyles.errorText}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

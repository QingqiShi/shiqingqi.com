"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ComponentProps,
} from "react";
import { useFieldAria } from "../../hooks/use-field-aria.ts";
import { a11y } from "../../primitives/a11y.stylex.ts";
import { transition } from "../../primitives/motion.stylex.ts";
import type { StyleProp } from "../../style-prop.ts";
import { mergeRefs } from "../../utils/merge-refs.ts";
import {
  fieldSizeBox,
  fieldSizeInline,
  fieldStyles,
} from "./field-shared.stylex.ts";

type FieldSize = "sm" | "md" | "lg";

interface TextareaProps extends Omit<
  ComponentProps<"textarea">,
  "className" | "style"
> {
  /**
   * Visible label text. Always required for an accessible name, even when
   * hidden via {@link TextareaProps.labelHidden} — never rely on a placeholder
   * to name the field.
   */
  label: string;
  /**
   * Visually hide the label (kept in the accessibility tree via `sr-only`).
   * The `label` string is still required.
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
  /** Control scale. Defaults to `"md"`. */
  size?: FieldSize;
  /**
   * Grow the textarea to fit its content instead of scrolling, disabling the
   * manual resize handle. Defaults to `false` (a fixed `rows`-tall box the user
   * can drag to resize).
   */
  autoGrow?: boolean;
  /** StyleX overrides merged over the control's own — the escape hatch. */
  css?: StyleProp;
}

/**
 * Multi-line text input sharing `TextField`'s label / description / error
 * chrome, with an optional {@link TextareaProps.autoGrow} that grows the box
 * to fit its content.
 *
 * Renders on the client because auto-grow measures the element after layout.
 */
export function Textarea({
  label,
  labelHidden,
  description,
  error,
  size = "md",
  autoGrow = false,
  rows = 3,
  id,
  required,
  disabled,
  css,
  value,
  defaultValue,
  onInput,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ref,
  ...rest
}: TextareaProps) {
  const {
    fieldId,
    descriptionId,
    errorId,
    hasDescription,
    hasError,
    describedBy,
    ariaInvalid: resolvedAriaInvalid,
  } = useFieldAria({ id, ariaDescribedBy, ariaInvalid, description, error });

  const innerRef = useRef<HTMLTextAreaElement>(null);
  const setRef = mergeRefs(innerRef, ref);

  const resize = useCallback(() => {
    const element = innerRef.current;
    if (!element) {
      return;
    }
    if (!autoGrow) {
      // Clears the inline height from a prior auto-grow, so the control
      // returns to its `rows` height once `autoGrow` turns off.
      element.style.blockSize = "";
      return;
    }
    // Height resets first so shrinking is measured, then grows to fit content.
    // `+ 2` adds the 1px block-start/end borders that `scrollHeight` excludes.
    element.style.blockSize = "auto";
    element.style.blockSize = `${String(element.scrollHeight + 2)}px`;
  }, [autoGrow]);

  // Re-measures on mount and when a controlled value changes; the `onInput`
  // wrapper below handles uncontrolled edits.
  useLayoutEffect(() => {
    resize();
  }, [resize, value]);

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
      <textarea
        {...rest}
        ref={setRef}
        id={fieldId}
        rows={rows}
        required={required}
        disabled={disabled}
        value={value}
        defaultValue={defaultValue}
        aria-invalid={resolvedAriaInvalid}
        aria-describedby={describedBy}
        onInput={(event) => {
          resize();
          onInput?.(event);
        }}
        css={[
          fieldStyles.control,
          fieldStyles.multiline,
          fieldSizeInline[size],
          fieldSizeBox[size],
          autoGrow ? fieldStyles.noResize : null,
          transition.colors,
          a11y.focusRing,
          hasError ? fieldStyles.controlInvalid : null,
          css,
        ]}
      />
      {hasError ? (
        <span id={errorId} role="alert" css={fieldStyles.errorText}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

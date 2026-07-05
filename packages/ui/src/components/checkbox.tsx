"use client";

import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, type ComponentProps } from "react";
import { useFieldAria } from "../hooks/use-field-aria.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { flex } from "../primitives/flex.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { border, color, controlSize, font, space } from "../tokens.stylex.ts";
import { mergeRefs } from "../utils/merge-refs.ts";
import { fieldStyles } from "./field-shared.stylex.ts";

// Centred glyphs painted as the box background once `:checked` / `:indeterminate`
// match. Drawn in `white` — which is `accentOn` in both themes — so they read on
// the accent fill without a theme-specific asset. Spaces/angle-brackets are
// percent-encoded so the data URI survives CSS parsing.
const CHECK_GLYPH =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Cpath%20d='M4%208.5l3%203%205-6'%20fill='none'%20stroke='white'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'/%3E%3C/svg%3E";
const DASH_GLYPH =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Cpath%20d='M4%208h8'%20fill='none'%20stroke='white'%20stroke-width='2'%20stroke-linecap='round'/%3E%3C/svg%3E";

type CheckboxSize = "sm" | "md";

interface CheckboxProps extends Omit<
  ComponentProps<"input">,
  "type" | "size" | "children"
> {
  /**
   * Visible text that labels the checkbox. Always rendered into the DOM so it
   * names the control; pass `labelHidden` to keep it screen-reader-only.
   */
  label: string;
  /**
   * Visually hide the label while keeping it as the accessible name. Use for a
   * checkbox whose meaning is already clear from surrounding context.
   */
  labelHidden?: boolean;
  /** Supporting copy shown beneath the label and wired via `aria-describedby`. */
  description?: string;
  /**
   * Error message shown beneath the label. Presence flips `aria-invalid` and
   * appends the message to `aria-describedby`.
   */
  error?: string;
  /**
   * Renders the mixed/partial ("dash") state. Reflected onto the DOM node's
   * `.indeterminate` property via a ref effect since it has no HTML attribute.
   */
  indeterminate?: boolean;
  /** Box and type scale. Defaults to `"md"`. */
  size?: CheckboxSize;
  /** StyleX styles merged over the root wrapper — the config-layer escape hatch. */
  css?: StyleXStyles;
}

/**
 * A labelled checkbox built on a native `<input type="checkbox">`, so keyboard
 * activation, focus, and label association come for free. The native box is
 * restyled in place (`appearance: none`) rather than hidden behind a proxy, and
 * forwards native input props (`checked`, `defaultChecked`, `onChange`, `name`,
 * `disabled`, `ref`, `className`, `style`, …). Supports a tri-state
 * `indeterminate` dash and an inline `error` message.
 */
export function Checkbox({
  label,
  labelHidden,
  description,
  error,
  indeterminate,
  size = "md",
  css,
  className,
  style,
  disabled,
  ref: forwardedRef,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...rest
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const setInputRef = mergeRefs(inputRef, forwardedRef);

  // `indeterminate` is a DOM property with no HTML attribute, so it can only be
  // set imperatively. Keep it in sync with the prop.
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);

  const {
    descriptionId,
    errorId,
    hasDescription,
    hasError,
    describedBy,
    ariaInvalid: resolvedAriaInvalid,
  } = useFieldAria({ ariaDescribedBy, ariaInvalid, description, error });

  return (
    <span css={[flex.col, styles.root, css]}>
      <label css={[flex.row, styles.row, disabled && styles.rowDisabled]}>
        <input
          {...rest}
          ref={setInputRef}
          type="checkbox"
          disabled={disabled}
          aria-invalid={resolvedAriaInvalid}
          aria-describedby={describedBy}
          className={className}
          style={style}
          css={[
            a11y.focusRing,
            transition.colors,
            styles.box,
            sizeStyles[size],
            !!error && styles.boxError,
          ]}
        />
        <span
          css={
            labelHidden
              ? a11y.srOnly
              : [styles.labelText, labelSizeStyles[size]]
          }
        >
          {label}
        </span>
      </label>
      {hasDescription ? (
        <span id={descriptionId} css={fieldStyles.description}>
          {description}
        </span>
      ) : null}
      {hasError ? (
        <span id={errorId} role="alert" css={fieldStyles.errorText}>
          {error}
        </span>
      ) : null}
    </span>
  );
}

const styles = stylex.create({
  root: {
    gap: space._1,
    alignItems: "flex-start",
  },
  row: {
    gap: space._2,
    cursor: "pointer",
  },
  rowDisabled: {
    cursor: "not-allowed",
  },
  box: {
    appearance: "none",
    margin: 0,
    flexShrink: 0,
    boxSizing: "border-box",
    borderStyle: "solid",
    borderWidth: border.size_2,
    borderColor: {
      default: color.neutralBorder,
      ":hover": color.accent,
      ":checked": color.accent,
      ":indeterminate": color.accent,
      ":disabled": color.neutralBorder,
    },
    borderRadius: border.radius_1,
    backgroundColor: {
      default: color.bgSurface,
      ":checked": color.accent,
      ":indeterminate": color.accent,
      ":disabled": color.bgInteractiveDisabled,
    },
    backgroundImage: {
      default: "none",
      ":checked": `url("${CHECK_GLYPH}")`,
      ":indeterminate": `url("${DASH_GLYPH}")`,
    },
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "74% 74%",
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": 0.6 },
  },
  boxError: {
    borderColor: {
      default: color.danger,
      ":hover": color.danger,
      ":checked": color.danger,
      ":indeterminate": color.danger,
    },
    // Recolour the shared focus ring to danger in the error state, matching
    // TextField/Textarea/Select's invalid treatment (composed after
    // `a11y.focusRing`, so it wins).
    outlineColor: { default: "transparent", ":focus-visible": color.danger },
  },
  labelText: {
    color: color.textMain,
    fontWeight: font.weight_5,
    lineHeight: font.lineHeight_2,
  },
});

const sizeStyles = stylex.create({
  sm: {
    inlineSize: controlSize._4,
    blockSize: controlSize._4,
  },
  md: {
    inlineSize: controlSize._5,
    blockSize: controlSize._5,
  },
});

const labelSizeStyles = stylex.create({
  sm: {
    fontSize: font.uiBodySmall,
  },
  md: {
    fontSize: font.uiControl,
  },
});

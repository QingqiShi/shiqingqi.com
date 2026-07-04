"use client";

import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { useId, type ComponentProps, type ReactNode } from "react";
import { a11y } from "../primitives/a11y.stylex.ts";
import { flex } from "../primitives/flex.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { border, color, controlSize, font, space } from "../tokens.stylex.ts";

type SelectSize = "sm" | "md";

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
  /** Control height and type scale. Defaults to `"md"`. */
  size?: SelectSize;
  /** `<option>` elements — the escape hatch when `options` is not enough. */
  children?: ReactNode;
  /** StyleX styles merged over the root wrapper — the config-layer escape hatch. */
  css?: StyleXStyles;
}

/**
 * Inline chevron matching Phosphor "CaretDown" metrics. Decorative — the select
 * carries its own accessible name — so it is `aria-hidden` and ignores pointer
 * events, letting clicks fall through to the native control beneath it.
 */
function ChevronIcon() {
  return (
    <svg
      css={styles.chevron}
      aria-hidden="true"
      viewBox="0 0 256 256"
      fill="none"
    >
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
 * for its built-in keyboard handling, platform picker, and reliability. The
 * native chevron is replaced with a themed one; the box is restyled but keeps
 * every native behaviour and forwards native select props (`value`,
 * `defaultValue`, `onChange`, `name`, `disabled`, `ref`, `className`, …).
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
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;

  const describedBy =
    [ariaDescribedBy, description && descriptionId, error && errorId]
      .filter(Boolean)
      .join(" ") || undefined;

  // A disabled placeholder is not auto-selected by the browser, so when the
  // select is uncontrolled and has no explicit default we point `defaultValue`
  // at the empty placeholder. Never emit `defaultValue` alongside a controlled
  // `value` (React warns), so only compute it when `value` is absent.
  const isControlled = value !== undefined;
  const resolvedDefaultValue = isControlled
    ? undefined
    : (defaultValue ?? (placeholder !== undefined ? "" : undefined));

  return (
    <span css={[flex.col, styles.root, css]}>
      <label
        htmlFor={id}
        css={labelHidden ? a11y.srOnly : [styles.label, labelSizeStyles[size]]}
      >
        {label}
      </label>
      <span css={styles.control}>
        <select
          {...rest}
          id={id}
          ref={ref}
          value={value}
          defaultValue={resolvedDefaultValue}
          disabled={disabled}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={describedBy}
          className={className}
          style={style}
          css={[
            a11y.focusRing,
            transition.colors,
            styles.select,
            sizeStyles[size],
            !!error && styles.selectError,
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
        <ChevronIcon />
      </span>
      {description ? (
        <span id={descriptionId} css={styles.description}>
          {description}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} css={styles.error}>
          {error}
        </span>
      ) : null}
    </span>
  );
}

const styles = stylex.create({
  root: {
    gap: space._1,
    alignItems: "stretch",
  },
  label: {
    color: color.textMain,
    fontWeight: font.weight_5,
    lineHeight: font.lineHeight_2,
  },
  control: {
    position: "relative",
    display: "block",
    inlineSize: "100%",
  },
  select: {
    appearance: "none",
    inlineSize: "100%",
    margin: 0,
    fontFamily: "inherit",
    color: color.textMain,
    backgroundColor: {
      default: color.bgSurface,
      ":disabled": color.bgInteractiveDisabled,
    },
    borderStyle: "solid",
    borderWidth: border.size_1,
    borderColor: {
      default: color.neutralBorder,
      ":hover": color.accent,
      ":disabled": color.neutralBorder,
    },
    borderRadius: border.radius_2,
    paddingInlineStart: space._2,
    // Leaves room for the absolutely-positioned chevron.
    paddingInlineEnd: space._7,
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": 0.6 },
  },
  selectError: {
    borderColor: {
      default: color.danger,
      ":hover": color.danger,
    },
  },
  chevron: {
    position: "absolute",
    insetInlineEnd: space._2,
    insetBlockStart: "50%",
    transform: "translateY(-50%)",
    inlineSize: "1em",
    blockSize: "1em",
    pointerEvents: "none",
    color: color.textMuted,
  },
  description: {
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_3,
    color: color.textMuted,
  },
  error: {
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_3,
    color: color.dangerText,
  },
});

const sizeStyles = stylex.create({
  sm: {
    minBlockSize: controlSize._8,
    paddingBlock: space._0,
    fontSize: font.uiBodySmall,
  },
  md: {
    minBlockSize: controlSize._9,
    paddingBlock: space._1,
    fontSize: font.uiControl,
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
